import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../shared/services/redis.service';
import { StockLogService, StockChangeReason } from '../../coupon/services/stock-log.service';

/**
 * 未支付订单超时自动取消服务
 *
 * 职责：
 * - 查询超时未支付的订单（createdAt + 超时时间 < now && status = UNPAID）
 * - 批量取消订单
 * - 恢复库存
 * - 自动恢复券模板上架状态
 */
@Injectable()
export class OrderCancellationService {
  private readonly logger = new Logger(OrderCancellationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly stockLogService: StockLogService,
  ) {}

  /**
   * 处理超时未支付订单
   *
   * 流程：
   * 1. 获取分布式锁
   * 2. 分批查询超时订单
   * 3. 逐个处理（取消订单 + 恢复库存）
   * 4. 释放锁
   */
  async handleTimeoutOrders() {
    // 1. 获取分布式锁（缩短超时时间到30秒，避免长时间阻塞）
    const lock = await this.redisService.acquireLock(
      'scheduler:order-cancellation',
      30000, // 30秒（之前是90秒）
      1, // 只重试1次，避免多次重试导致长时间等待
      1000, // 重试间隔1秒
    );

    if (!lock) {
      this.logger.warn('订单取消任务正在其他实例执行');
      return;
    }

    try {
      const batchSize = Number(
        this.configService.get('SCHEDULER_BATCH_SIZE') || 100,
      );
      const timeoutMinutes = Number(
        this.configService.get('ORDER_TIMEOUT_MINUTES') || 15,
      );

      let processed = 0;
      let failed = 0;

      // 2. 分批处理超时订单
      while (true) {
        const orders = await this.getTimeoutOrders(batchSize, timeoutMinutes);
        if (orders.length === 0) break;

        for (const order of orders) {
          try {
            await this.processTimeoutOrder(order);
            processed++;
          } catch (error) {
            failed++;
            await this.recordFailure(order, error);
          }
        }

        // 避免 CPU 占用过高
        await this.sleep(500);
      }

      if (processed > 0 || failed > 0) {
        this.logger.log(
          `超时订单取消完成: 处理 ${processed} 条, 失败 ${failed} 条`,
        );
      }
    } catch (error) {
      this.logger.error('处理超时订单失败', error);
      throw error;
    } finally {
      // 释放锁
      await this.redisService.releaseLock(
        'scheduler:order-cancellation',
        lock,
      );
    }
  }

  /**
   * 获取超时未支付订单
   *
   * 查询条件：
   * - status = UNPAID
   * - createdAt + timeoutMinutes < now
   */
  private async getTimeoutOrders(limit: number, timeoutMinutes: number) {
    const timeoutThreshold = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    return this.prisma.order.findMany({
      where: {
        status: 'UNPAID',
        createdAt: {
          lt: timeoutThreshold,
        },
      },
      include: {
        template: true,
      },
      take: limit,
      orderBy: {
        createdAt: 'asc', // 优先处理最早超时的订单
      },
    });
  }

  /**
   * 处理单个超时订单
   *
   * 步骤：
   * 1. 取消订单（状态改为 CANCELLED）
   * 2. 恢复库存
   * 3. 如果券模板之前是售罄状态，恢复上架
   * 4. 记录库存变更日志
   */
  private async processTimeoutOrder(order: any) {
    this.logger.log(
      `处理超时订单: ${order.orderNo} (ID: ${order.id}, 创建时间: ${order.createdAt}, 超时 ${this.configService.get('ORDER_TIMEOUT_MINUTES') || 15} 分钟)`,
    );

    // 查询当前券模板状态
    const currentTemplate = await this.prisma.couponTemplate.findUnique({
      where: { id: order.templateId },
    });

    if (!currentTemplate) {
      this.logger.error(`券模板不存在: ${order.templateId}`);
      return;
    }

    // 1. 取消订单
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
      },
    });

    // 2. 恢复库存并更新券模板状态
    // 如果之前库存为0（状态为 DISABLED），恢复后改为 ACTIVE
    const shouldReactivate = currentTemplate.stock === 0 && currentTemplate.status === 'DISABLED';

    const updatedTemplate = await this.prisma.couponTemplate.update({
      where: { id: order.templateId },
      data: {
        stock: { increment: 1 },
        // 如果之前是售罄状态，恢复库存后改为上架
        ...(shouldReactivate && { status: 'ACTIVE' }),
      },
    });

    // ✅ 3. 记录库存变更日志
    await this.stockLogService.log(
      order.templateId,
      1, // 恢复库存
      updatedTemplate.stock,
      StockChangeReason.ORDER_CANCEL,
      order.id,
      undefined,
      { orderNo: order.orderNo, timeoutMinutes: this.configService.get('ORDER_TIMEOUT_MINUTES') || 15 },
    );

    this.logger.log(
      `订单已取消: ${order.orderNo}, 库存已恢复 (当前库存: ${updatedTemplate.stock})`,
    );

    if (shouldReactivate) {
      this.logger.log(
        `券模板已重新上架: ${order.template.title} (ID: ${order.templateId})`,
      );
    }
  }

  /**
   * 记录处理失败
   */
  private async recordFailure(order: any, error: any) {
    this.logger.error(
      `订单取消失败: ${order.orderNo}, 错误: ${error.message}`,
      error.stack,
    );
  }

  /**
   * 辅助方法：睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}