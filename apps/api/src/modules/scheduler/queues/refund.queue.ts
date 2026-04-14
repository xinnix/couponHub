import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

/**
 * 退款任务数据结构
 */
export interface RefundJobData {
  orderId: string;
  orderNo: string;
  userId: string;
  price: number;
  reason: 'EXPIRED' | 'USER_REQUEST';
  refundNo: string;
}

/**
 * 退款队列服务
 *
 * 负责将退款任务推送到 BullMQ 队列，由 Processor 异步处理
 */
@Injectable()
export class RefundQueue {
  private readonly logger = new Logger(RefundQueue.name);

  constructor(
    @InjectQueue('refund') private refundQueue: Queue<RefundJobData>,
  ) {}

  /**
   * 添加单个退款任务到队列
   *
   * @param data 退款任务数据
   */
  async addRefundJob(data: RefundJobData) {
    const job = await this.refundQueue.add('process-refund', data, {
      attempts: 5, // 最多重试 5 次
      backoff: {
        type: 'exponential',
        delay: 2000, // 初始延迟 2 秒，指数递增（2s, 4s, 8s, 16s, 32s）
      },
      removeOnComplete: 100, // 成功后保留最近 100 条记录
      removeOnFail: 500, // 失败后保留最近 500 条记录（用于问题排查）
    });

    this.logger.log(
      `退款任务已加入队列: 订单 ${data.orderNo}, 任务ID ${job.id}, 原因 ${data.reason}`,
    );

    return job;
  }

  /**
   * 批量添加退款任务（用于过期批量退款）
   *
   * BullMQ 会自动按照 concurrency 配置限流处理
   *
   * @param orders 退款任务数组
   */
  async addBatchRefundJobs(orders: RefundJobData[]) {
    this.logger.log(`批量添加 ${orders.length} 个退款任务到队列`);

    const jobs = await this.refundQueue.addBulk(
      orders.map((order) => ({
        name: 'process-refund',
        data: order,
        options: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      })),
    );

    this.logger.log(
      `已添加 ${jobs.length} 个退款任务到队列（预计处理时间: ${(jobs.length / 3).toFixed(0)} 分钟）`,
    );

    return jobs;
  }

  /**
   * 获取队列状态统计
   *
   * 用于监控队列健康度
   */
  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.refundQueue.getWaitingCount(),
      this.refundQueue.getActiveCount(),
      this.refundQueue.getCompletedCount(),
      this.refundQueue.getFailedCount(),
    ]);

    return {
      waiting, // 等待处理
      active, // 正在处理
      completed, // 已完成
      failed, // 失败
      total: waiting + active + completed + failed,
    };
  }

  /**
   * 清空队列（谨慎使用，仅用于测试或紧急情况）
   */
  async emptyQueue() {
    this.logger.warn('清空退款队列（所有任务将被移除）');
    await this.refundQueue.empty();
  }

  /**
   * 手动重试失败的任务（通过 Bull Board 可视化操作）
   */
  async retryFailedJob(jobId: string) {
    const job = await this.refundQueue.getJob(jobId);
    if (job) {
      await job.retry();
      this.logger.log(`手动重试任务: ${jobId}`);
    }
  }
}