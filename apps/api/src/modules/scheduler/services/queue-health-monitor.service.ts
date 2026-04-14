import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RefundQueue } from '../queues/refund.queue';

/**
 * 队列健康监控服务
 *
 * 职责：
 * - 定期检查队列堆积情况
 * - 发现异常时记录告警日志
 * - 提供队列健康度评分
 *
 * 监控指标：
 * - waiting > 100：队列堆积告警
 * - failed > 10：失败任务过多告警
 * - active > 5：并发数异常告警（正常应为 3）
 */
@Injectable()
export class QueueHealthMonitor {
  private readonly logger = new Logger(QueueHealthMonitor.name);

  constructor(private readonly refundQueue: RefundQueue) {}

  /**
   * 定时检查队列健康度（每 5 分钟）
   */
  @Cron('*/5 * * * *')
  async checkQueueHealth() {
    try {
      const stats = await this.refundQueue.getQueueStats();

      // 正常情况：不输出日志（避免噪音）
      if (stats.waiting <= 50 && stats.failed <= 5 && stats.active <= 3) {
        return;
      }

      // ⚠️ 队列堆积告警（waiting > 100）
      if (stats.waiting > 100) {
        this.logger.warn(
          `⚠️  退款队列堆积告警: ${stats.waiting} 个任务等待处理（预计耗时 ${(stats.waiting / 3).toFixed(0)} 分钟）`,
        );
        this.logger.warn(
          `建议措施: 提高并发数（改为 5）或检查微信 API 额度`,
        );
      }

      // ⚠️ 失败任务过多告警（failed > 10）
      if (stats.failed > 10) {
        this.logger.warn(
          `⚠️  退款失败任务过多: ${stats.failed} 个任务失败`,
        );
        this.logger.warn(
          `建议措施: 检查微信支付配置或手动重试失败任务`,
        );
      }

      // ⚠️ 并发数异常告警（active > 5）
      if (stats.active > 5) {
        this.logger.warn(
          `⚠️  并发数异常: ${stats.active} 个任务正在处理（预期值: 3）`,
        );
        this.logger.warn(
          `建议措施: 检查 Processor 配置或重启服务`,
        );
      }

      // 📊 队列状态摘要（仅在异常时输出）
      this.logger.log(
        `队列状态: waiting=${stats.waiting}, active=${stats.active}, completed=${stats.completed}, failed=${stats.failed}`,
      );
    } catch (error) {
      this.logger.error('队列健康检查失败', error);
    }
  }

  /**
   * 手动获取队列健康度评分
   *
   * 评分标准：
   * - 100：完美（waiting=0, failed=0）
   * - 80-99：良好（waiting<50, failed<5）
   * - 60-79：一般（waiting<100, failed<10）
   * - 40-59：较差（waiting>=100 或 failed>=10）
   * - 0-39：危险（waiting>=200 或 failed>=50）
   */
  async getHealthScore(): Promise<{
    score: number;
    level: 'PERFECT' | 'GOOD' | 'NORMAL' | 'POOR' | 'DANGER';
    stats: any;
    recommendations: string[];
  }> {
    const stats = await this.refundQueue.getQueueStats();

    let score = 100;
    let level: 'PERFECT' | 'GOOD' | 'NORMAL' | 'POOR' | 'DANGER' = 'PERFECT';
    const recommendations: string[] = [];

    // waiting 影响
    if (stats.waiting > 0) {
      score -= Math.min(40, Math.floor(stats.waiting / 5));
    }

    // failed 影响
    if (stats.failed > 0) {
      score -= Math.min(50, stats.failed * 5);
    }

    // active 异常影响
    if (stats.active > 3) {
      score -= 10;
      recommendations.push('检查并发数配置');
    }

    // 确定健康等级
    if (score >= 100) {
      level = 'PERFECT';
      recommendations.push('队列运行完美，无需优化');
    } else if (score >= 80) {
      level = 'GOOD';
      if (stats.waiting > 0) {
        recommendations.push('队列有少量堆积，建议观察');
      }
    } else if (score >= 60) {
      level = 'NORMAL';
      recommendations.push('队列有中等堆积，建议优化');
    } else if (score >= 40) {
      level = 'POOR';
      recommendations.push('队列堆积严重，立即处理');
      if (stats.waiting > 100) {
        recommendations.push('提高并发数到 5');
      }
      if (stats.failed > 10) {
        recommendations.push('检查失败任务原因');
      }
    } else {
      level = 'DANGER';
      recommendations.push('队列濒临崩溃，紧急处理');
      recommendations.push('考虑暂停新任务入队');
      recommendations.push('手动清理失败任务');
    }

    return {
      score,
      level,
      stats,
      recommendations,
    };
  }
}