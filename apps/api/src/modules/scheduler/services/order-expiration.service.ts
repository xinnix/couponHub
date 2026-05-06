import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../shared/services/redis.service";
import { RefundQueue, RefundJobData } from "../queues/refund.queue";

/**
 * 订单使用期过期标记服务
 *
 * 职责：
 * - 扫描使用期过期的订单（expireAt < now && status = PAID）
 * - 标记订单为 EXPIRED（已过期状态）
 * - 管理员在后台审核后手动退款
 *
 * 流程：
 * - 过期订单标记为 EXPIRED
 * - 管理端只对 EXPIRED 状态订单显示退款按钮
 * - 管理员点击退款时：EXPIRED → REFUNDING → 推送退款队列
 */
@Injectable()
export class OrderExpirationService {
  private readonly logger = new Logger(OrderExpirationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 处理过期订单
   *
   * 流程：
   * 1. 获取分布式锁（防止多实例重复执行）
   * 2. 扫描过期订单（已支付且未核销）
   * 3. 批量标记为 EXPIRED（已过期状态）
   * 4. 释放锁
   *
   * 注意：
   * - 只标记状态为 EXPIRED
   * - 管理员需要在后台手动审核退款
   */
  async handleExpiredOrders() {
    // 1. 获取分布式锁
    const lock = await this.redisService.acquireLock(
      "scheduler:order-expiration",
      60000, // 60秒
    );

    if (!lock) {
      this.logger.warn("订单过期任务正在其他实例执行");
      return;
    }

    try {
      // ② 扫描所有过期订单（已支付且未核销）
      const expiredOrders = await this.prisma.order.findMany({
        where: {
          status: "PAID",
          expireAt: { lt: new Date() },
          redeemedAt: null, //  未核销的订单才能标记为可退款
        },
        include: { template: true },
      });

      if (expiredOrders.length === 0) {
        this.logger.debug("无过期订单");
        return;
      }

      this.logger.log(`发现 ${expiredOrders.length} 个过期订单`);

      // ③ 批量标记订单为 EXPIRED（已过期状态）
      await this.prisma.order.updateMany({
        where: {
          id: { in: expiredOrders.map((o) => o.id) },
        },
        data: { status: "EXPIRED" },
      });

      this.logger.log(
        `已标记 ${expiredOrders.length} 个订单为 EXPIRED（已过期），等待管理员审核退款`,
      );

      // ④ 记录统计信息（供管理员查看）
      const refundableOrders = expiredOrders.filter(
        (order) => !order.isFreeOrder && Number(order.price) > 0,
      );

      const freeOrders = expiredOrders.filter(
        (order) => order.isFreeOrder || Number(order.price) === 0,
      );

      if (refundableOrders.length > 0) {
        const totalAmount = refundableOrders.reduce(
          (sum, order) => sum + Number(order.price),
          0,
        );
        this.logger.log(
          `退款统计：${refundableOrders.length} 个待退款订单，总金额 ${totalAmount.toFixed(2)} 元`,
        );
      }

      if (freeOrders.length > 0) {
        this.logger.log(`免费订单：${freeOrders.length} 个（无需退款）`);
      }
    } catch (error) {
      this.logger.error("扫描过期订单失败", error);
      throw error;
    } finally {
      // 释放锁
      await this.redisService.releaseLock("scheduler:order-expiration", lock);
    }
  }
}
