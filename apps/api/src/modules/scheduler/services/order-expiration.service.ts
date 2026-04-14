import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../shared/services/redis.service';
import { RefundQueue, RefundJobData } from '../queues/refund.queue';

/**
 * 订单使用期过期自动退款服务
 *
 * 职责：
 * - 扫描使用期过期的订单（expireAt < now && status = PAID）
 * - 标记订单为 EXPIRED
 * - 推送退款任务到 BullMQ 队列（异步处理）
 * - 队列会自动限流、重试，符合微信 API 频率限制
 */
@Injectable()
export class OrderExpirationService {
  private readonly logger = new Logger(OrderExpirationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly refundQueue: RefundQueue, // 注入退款队列
    private readonly configService: ConfigService,
  ) {}

  /**
   * 处理过期订单（改造后）
   *
   * 流程：
   * 1. 获取分布式锁（防止多实例重复执行）
   * 2. 扫描过期订单（大批量）
   * 3. 批量标记为 EXPIRED
   * 4. 推送退款任务到 BullMQ 队列（队列会自动限流处理）
   * 5. 释放锁
   *
   * 性能：
   * - 扫描 1000 张券仅需 1 分钟（数据库批量操作）
   * - 退款处理由队列异步完成（3 并发，约 5.5 小时）
   */
  async handleExpiredOrders() {
    // 1. 获取分布式锁
    const lock = await this.redisService.acquireLock(
      'scheduler:order-expiration',
      60000, // 60秒（仅扫描，不处理退款）
    );

    if (!lock) {
      this.logger.warn('订单过期任务正在其他实例执行');
      return;
    }

    try {
      // ② 扫描所有过期订单（一次性批量查询）
      const expiredOrders = await this.prisma.order.findMany({
        where: {
          status: 'PAID',
          expireAt: { lt: new Date() },
        },
        include: { template: true },
      });

      if (expiredOrders.length === 0) {
        this.logger.debug('无过期订单');
        return;
      }

      this.logger.log(`发现 ${expiredOrders.length} 个过期订单`);

      // ③ 批量标记订单为 EXPIRED（数据库批量更新）
      await this.prisma.order.updateMany({
        where: {
          id: { in: expiredOrders.map((o) => o.id) },
        },
        data: { status: 'EXPIRED' },
      });

      this.logger.log(`已标记 ${expiredOrders.length} 个订单为 EXPIRED`);

      // ④ 过滤免费订单（无需退款）
      const refundableOrders = expiredOrders.filter(
        (order) => !order.isFreeOrder && Number(order.price) > 0,
      );

      if (refundableOrders.length === 0) {
        this.logger.log('所有过期订单均为免费券，无需退款');
        return;
      }

      // ⑤ 构造退款任务数据
      const refundJobs: RefundJobData[] = refundableOrders.map((order) => ({
        orderId: order.id,
        orderNo: order.orderNo,
        userId: order.userId,
        price: Number(order.price),
        reason: 'EXPIRED',
        refundNo: `expire_refund_${Date.now()}_${order.id}`,
      }));

      // ⑥ 批量推送到退款队列（BullMQ 会自动限流处理）
      await this.refundQueue.addBatchRefundJobs(refundJobs);

      this.logger.log(
        `已推送 ${refundJobs.length} 个退款任务到队列（预计处理时间: ${(refundJobs.length / 3).toFixed(0)} 分钟）`,
      );
    } catch (error) {
      this.logger.error('扫描过期订单失败', error);
      throw error;
    } finally {
      // 释放锁
      await this.redisService.releaseLock(
        'scheduler:order-expiration',
        lock,
      );
    }
  }

  }