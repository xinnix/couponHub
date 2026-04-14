import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RefundQueue } from '../queues/refund.queue';
import { QueueHealthMonitor } from '../services/queue-health-monitor.service';

/**
 * 队列监控控制器
 *
 * 提供队列状态查询接口，用于监控退款队列健康度
 */
@ApiTags('scheduler')
@Controller('scheduler/queue')
export class QueueMonitorController {
  constructor(
    private readonly refundQueue: RefundQueue,
    private readonly healthMonitor: QueueHealthMonitor,
  ) {}

  /**
   * 获取退款队列状态
   *
   * 返回：
   * - waiting: 等待处理的任务数
   * - active: 正在处理的任务数
   * - completed: 已完成的任务数
   * - failed: 失败的任务数
   * - total: 总任务数
   */
  @Get('refund/stats')
  @ApiOperation({ summary: '查询退款队列状态' })
  async getRefundQueueStats() {
    const stats = await this.refundQueue.getQueueStats();

    return {
      success: true,
      data: {
        ...stats,
        processingRate: '180 次/分钟', // 固定值（并发 3）
        maxConcurrency: 3,
        estimatedTime:
          stats.waiting > 0
            ? `${(stats.waiting / 3).toFixed(0)} 分钟`
            : '0 分钟',
      },
    };
  }

  /**
   * 获取队列健康度评分
   *
   * 评分标准：
   * - 100：完美（waiting=0, failed=0）
   * - 80-99：良好（waiting<50, failed<5）
   * - 60-79：一般（waiting<100, failed<10）
   * - 40-59：较差（waiting>=100 或 failed>=10）
   * - 0-39：危险（waiting>=200 或 failed>=50）
   *
   * 返回：
   * - score: 健康度评分（0-100）
   * - level: 健康等级（PERFECT/GOOD/NORMAL/POOR/DANGER）
   * - stats: 队列统计数据
   * - recommendations: 优化建议
   */
  @Get('refund/health')
  @ApiOperation({ summary: '查询退款队列健康度' })
  async getQueueHealth() {
    const health = await this.healthMonitor.getHealthScore();

    return {
      success: true,
      data: health,
    };
  }
}