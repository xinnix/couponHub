import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisService } from '../../shared/services/redis.service';
import { WechatPayService } from '../payment/services/wechat-pay.service';
import { CouponTemplateExpirationService } from './services/coupon-template-expiration.service';
import { OrderExpirationService } from './services/order-expiration.service';
import { CouponTemplateExpirationTask } from './tasks/coupon-template.task';
import { OrderExpirationTask } from './tasks/order.task';

/**
 * Scheduler 模块
 *
 * 提供定时任务功能：
 * - 券模板销售期过期检查（每5分钟）
 * - 订单使用期过期自动退款（每10分钟）
 */
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    // 基础服务
    RedisService,
    WechatPayService,
    // 过期处理服务
    CouponTemplateExpirationService,
    OrderExpirationService,
    // 定时任务
    CouponTemplateExpirationTask,
    OrderExpirationTask,
  ],
  exports: [
    CouponTemplateExpirationService,
    OrderExpirationService,
  ],
})
export class SchedulerModule {}