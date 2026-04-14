import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { RefundJobData } from '../queues/refund.queue';
import { PrismaService } from '../../../prisma/prisma.service';
import { WechatPayService } from '../../payment/services/wechat-pay.service';

/**
 * 退款队列处理器
 *
 * 关键配置：
 * - concurrency: 3（并发处理数）
 * - 符合微信支付退款 API 频率限制（200 次/分钟）
 * - 实际处理速率: 3 × 60 = 180 次/分钟 < 微信限制 ✅
 */
@Processor('refund')
export class RefundProcessor {
  private readonly logger = new Logger(RefundProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wechatPayService: WechatPayService,
  ) {}

  /**
   * 处理退款任务
   *
   * 流程：
   * 1. 检查订单状态（避免重复退款）
   * 2. 更新订单状态为 REFUNDING
   * 3. 调用微信退款 API
   * 4. 等待微信回调处理后续逻辑（库存恢复、日志记录）
   *
   * 注意：
   * - BullMQ 会自动重试失败任务（最多 5 次）
   * - 微信回调会在 payment.controller.ts 中处理
   */
  @Process({
    name: 'process-refund',
    concurrency: 3, // 🔑 关键：限制并发数，避免触发微信 API 限流
  })
  async processRefund(job: Job<RefundJobData>) {
    const { orderId, orderNo, userId, price, reason, refundNo } = job.data;

    this.logger.log(
      `开始处理退款任务: 订单 ${orderNo} (任务ID: ${job.id}, 尝试次数: ${job.attemptsMade + 1}/${job.opts.attempts})`,
    );

    try {
      // ① 查询订单状态，避免重复退款
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error(`订单不存在: ${orderId}`);
      }

      // 状态检查：只有 PAID 或 EXPIRED 可以退款
      if (order.status !== 'PAID' && order.status !== 'EXPIRED') {
        this.logger.warn(
          `订单状态异常，跳过退款: ${orderNo}, 当前状态: ${order.status}`,
        );
        return { success: false, reason: '订单状态不符合退款条件' };
      }

      // ② 更新订单状态为 REFUNDING
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'REFUNDING',
          refundReason:
            reason === 'EXPIRED' ? '订单过期自动退款' : '用户申请退款',
        },
      });

      this.logger.debug(`订单状态已更新为 REFUNDING: ${orderNo}`);

      // ③ 调用微信退款 API
      const refundId = await this.wechatPayService.refund({
        orderNo,
        refundNo,
        totalAmount: price,
        refundAmount: price, // 全额退款
        reason:
          reason === 'EXPIRED' ? '订单过期自动退款' : '用户申请退款',
      });

      this.logger.log(
        `退款请求成功: 订单 ${orderNo}, 退款单号 ${refundNo}, 微信退款ID ${refundId}, 等待回调确认`,
      );

      // ④ 返回成功（后续逻辑由微信回调处理）
      return {
        success: true,
        refundId,
        refundNo,
      };
    } catch (error: any) {
      this.logger.error(
        `退款任务失败: 订单 ${orderNo}, 错误: ${error.message}`,
        error.stack,
      );

      // BullMQ 会自动重试（指数退避：2s, 4s, 8s, 16s, 32s）
      throw error;
    }
  }

  /**
   * 任务开始执行时的钩子
   */
  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(
      `任务开始执行: ${job.id}, 类型: ${job.name}, 数据: ${JSON.stringify(job.data)}`,
    );
  }

  /**
   * 任务成功完成时的钩子
   */
  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.debug(
      `任务完成: ${job.id}, 结果: ${JSON.stringify(result)}`,
    );
  }

  /**
   * 任务失败时的钩子
   */
  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `任务失败: ${job.id}, 尝试次数: ${job.attemptsMade}, 错误: ${error.message}`,
      error.stack,
    );

    // 如果达到最大重试次数，记录到失败日志（可选）
    if (job.attemptsMade >= job.opts.attempts - 1) {
      this.logger.warn(
        `任务达到最大重试次数，将保留在失败队列: ${job.id}, 订单: ${job.data.orderNo}`,
      );
    }
  }
}