import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { OrderCancellationService } from '../services/order-cancellation.service';

/**
 * 未支付订单超时取消定时任务
 *
 * 执行频率：每5分钟
 */
@Injectable()
export class OrderCancellationTask {
  private readonly logger = new Logger(OrderCancellationTask.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly cancellationService: OrderCancellationService,
  ) {}

  @Cron('0 */5 * * * *') // 每5分钟执行一次
  async handleCron() {
    // 检查定时任务是否启用
    const schedulerEnabled =
      this.configService.get('SCHEDULER_ENABLED') === 'true';

    if (!schedulerEnabled) {
      this.logger.debug('定时任务已禁用，跳过执行');
      return;
    }

    this.logger.log('开始检查超时未支付订单...');
    const startTime = Date.now();

    try {
      await this.cancellationService.handleTimeoutOrders();

      const duration = Date.now() - startTime;
      this.logger.log(`超时订单检查完成，耗时 ${duration}ms`);
    } catch (error) {
      this.logger.error('超时订单检查失败', error);
    }
  }
}