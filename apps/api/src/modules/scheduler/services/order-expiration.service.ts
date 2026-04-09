import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../shared/services/redis.service';
import { WechatPayService } from '../../payment/services/wechat-pay.service';

/**
 * 订单使用期过期自动退款服务
 *
 * 职责：
 * - 查询使用期过期的订单（expireAt < now && status = PAID）
 * - 标记订单为 EXPIRED
 * - 自动发起全额退款
 * - 处理退款失败情况
 */
@Injectable()
export class OrderExpirationService {
  private readonly logger = new Logger(OrderExpirationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly wechatPayService: WechatPayService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 处理过期订单
   *
   * 流程：
   * 1. 获取分布式锁
   * 2. 分批查询过期订单
   * 3. 逐个处理（标记过期 + 发起退款）
   * 4. 记录失败订单
   * 5. 释放锁
   */
  async handleExpiredOrders() {
    // 1. 获取分布式锁
    const lock = await this.redisService.acquireLock(
      'scheduler:order-expiration',
      90000, // 90秒
    );

    if (!lock) {
      this.logger.warn('订单过期任务正在其他实例执行');
      return;
    }

    try {
      const batchSize = Number(
        this.configService.get('SCHEDULER_BATCH_SIZE') || 100,
      );
      let processed = 0;
      let failed = 0;

      // 2. 分批处理过期订单
      while (true) {
        const orders = await this.getExpiredOrders(batchSize);
        if (orders.length === 0) break;

        for (const order of orders) {
          try {
            await this.processExpiredOrder(order);
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
          `订单过期处理完成: 处理 ${processed} 条, 失败 ${failed} 条`,
        );
      }
    } catch (error) {
      this.logger.error('处理过期订单失败', error);
      throw error;
    } finally {
      // 释放锁
      await this.redisService.releaseLock(
        'scheduler:order-expiration',
        lock,
      );
    }
  }

  /**
   * 获取过期订单
   *
   * 查询条件：
   * - status = PAID
   * - expireAt < now
   */
  private async getExpiredOrders(limit: number) {
    return this.prisma.order.findMany({
      where: {
        status: 'PAID',
        expireAt: {
          lt: new Date(),
        },
      },
      include: {
        template: true,
        user: true,
      },
      take: limit,
      orderBy: {
        expireAt: 'asc', // 优先处理最早过期的订单
      },
    });
  }

  /**
   * 处理单个过期订单
   *
   * 步骤：
   * 1. 标记订单为 EXPIRED
   * 2. 发起自动退款
   */
  private async processExpiredOrder(order: any) {
    this.logger.log(
      `处理过期订单: ${order.orderNo} (ID: ${order.id}, 过期时间: ${order.expireAt})`,
    );

    // 1. 标记订单为 EXPIRED
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'EXPIRED' },
    });

    // 2. 发起自动退款（检查是否启用）
    const autoRefundEnabled =
      this.configService.get('AUTO_REFUND_ENABLED') === 'true';

    if (!autoRefundEnabled) {
      this.logger.debug(`自动退款已禁用，跳过订单 ${order.orderNo}`);
      return;
    }

    // 检查是否为免费订单
    if (order.isFreeOrder || Number(order.price) === 0) {
      this.logger.debug(`免费订单无需退款: ${order.orderNo}`);
      return;
    }

    // 发起退款
    await this.initiateAutoRefund(order);
  }

  /**
   * 发起自动退款
   */
  private async initiateAutoRefund(order: any) {
    try {
      // 更新状态为 REFUNDING
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'REFUNDING',
          refundReason: '订单过期自动退款',
        },
      });

      // 调用微信退款 API
      const refundNo = `expire_refund_${Date.now()}`;
      const refundId = await this.wechatPayService.refund({
        orderNo: order.orderNo,
        refundNo: refundNo,
        totalAmount: Number(order.price),
        refundAmount: Number(order.price), // 全额退款
        reason: '订单过期自动退款',
      });

      this.logger.log(
        `自动退款已发起: 订单 ${order.orderNo}, 退款单号 ${refundNo}, 微信退款ID ${refundId}`,
      );
    } catch (error) {
      // 退款失败，恢复状态并记录
      await this.handleRefundFailure(order, error);
      throw error;
    }
  }

  /**
   * 处理退款失败
   */
  private async handleRefundFailure(order: any, error: any) {
    this.logger.error(
      `自动退款失败: 订单 ${order.orderNo}, 错误: ${error.message}`,
    );

    // 恢复订单状态为 EXPIRED
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'EXPIRED',
        refundReason: `自动退款失败: ${error.message}`,
      },
    });

    // TODO: 写入退款失败队列供人工处理
    // await this.prisma.refundFailureLog.create({...});
  }

  /**
   * 记录处理失败
   */
  private async recordFailure(order: any, error: any) {
    this.logger.error(
      `订单处理失败: ${order.orderNo}, 错误: ${error.message}`,
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