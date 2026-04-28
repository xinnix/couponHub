import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CouponTemplateExpirationService } from '../services/coupon-template-expiration.service';

/**
 * 券模板过期定时任务
 *
 * 执行频率：每天凌晨 2 点
 */
@Injectable()
export class CouponTemplateExpirationTask {
  private readonly logger = new Logger(CouponTemplateExpirationTask.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly expirationService: CouponTemplateExpirationService,
  ) {}

  @Cron('0 0 2 * * *', { timeZone: 'Asia/Shanghai' })
  async handleCron() {
    // 检查定时任务是否启用
    const schedulerEnabled =
      this.configService.get('SCHEDULER_ENABLED') === 'true';

    if (!schedulerEnabled) {
      this.logger.debug('定时任务已禁用，跳过执行');
      return;
    }

    this.logger.log('开始检查过期券模板...');
    const startTime = Date.now();

    try {
      await this.expirationService.handleExpiredTemplates();

      const duration = Date.now() - startTime;
      this.logger.log(`券模板过期检查完成，耗时 ${duration}ms`);
    } catch (error) {
      this.logger.error('券模板过期检查失败', error);
    }
  }
}