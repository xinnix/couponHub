import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { OrderExpirationService } from '../services/order-expiration.service';

/**
 * 订单过期自动退款定时任务
 *
 * 执行频率：每10分钟
 */
@Injectable()
export class OrderExpirationTask {
  private readonly logger = new Logger(OrderExpirationTask.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly expirationService: OrderExpirationService,
  ) {}

  @Cron('0 */10 * * * *') // 每10分钟执行一次
  async handleCron() {
    // 检查定时任务是否启用
    const schedulerEnabled =
      this.configService.get('SCHEDULER_ENABLED') === 'true';

    if (!schedulerEnabled) {
      this.logger.debug('定时任务已禁用，跳过执行');
      return;
    }

    this.logger.log('开始检查过期订单...');
    const startTime = Date.now();

    try {
      await this.expirationService.handleExpiredOrders();

      const duration = Date.now() - startTime;
      this.logger.log(`订单过期检查完成，耗时 ${duration}ms`);
    } catch (error) {
      this.logger.error('订单过期检查失败', error);
    }
  }
}