import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { OrderCancellationService } from '../services/order-cancellation.service';

/**
 * 未支付订单超时取消定时任务
 *
 * 执行频率：每15分钟
 * 使用分布式锁避免多实例重复执行
 */
@Injectable()
export class OrderCancellationTask {
  private readonly logger = new Logger(OrderCancellationTask.name);
  private isRunning = false; // 防止同一实例内重复执行

  constructor(
    private readonly configService: ConfigService,
    private readonly cancellationService: OrderCancellationService,
  ) {}

  @Cron('0 */15 * * * *', { timeZone: 'Asia/Shanghai' })
  async handleCron() {
    // 检查定时任务是否启用
    const schedulerEnabled =
      this.configService.get('SCHEDULER_ENABLED') === 'true';

    if (!schedulerEnabled) {
      this.logger.debug('定时任务已禁用，跳过执行');
      return;
    }

    // 防止同一实例内重复执行（如果上一个任务还在执行）
    if (this.isRunning) {
      this.logger.warn('上一个任务还在执行，跳过本次触发');
      return;
    }

    this.isRunning = true;
    this.logger.log('开始检查超时未支付订单...');
    const startTime = Date.now();

    // 添加超时保护：5分钟强制终止
    const TIMEOUT_MS = 5 * 60 * 1000;
    const timeoutTimer = setTimeout(() => {
      this.logger.error('任务执行超时（5分钟），强制终止');
      this.isRunning = false;
    }, TIMEOUT_MS);

    try {
      await this.cancellationService.handleTimeoutOrders();

      clearTimeout(timeoutTimer); // 清除超时计时器
      const duration = Date.now() - startTime;
      this.logger.log(`超时订单检查完成，耗时 ${duration}ms`);
    } catch (error) {
      clearTimeout(timeoutTimer); // 清除超时计时器
      this.logger.error('超时订单检查失败', error);
    } finally {
      this.isRunning = false; // 确保标志位被重置
    }
  }
}