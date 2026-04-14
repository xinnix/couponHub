import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { RedisService } from '../../shared/services/redis.service';
import { WechatPayService } from '../payment/services/wechat-pay.service';
import { CouponModule } from '../coupon/module';
import { CouponTemplateExpirationService } from './services/coupon-template-expiration.service';
import { OrderExpirationService } from './services/order-expiration.service';
import { OrderCancellationService } from './services/order-cancellation.service';
import { CouponTemplateExpirationTask } from './tasks/coupon-template.task';
import { OrderExpirationTask } from './tasks/order.task';
import { OrderCancellationTask } from './tasks/order-cancellation.task';
import { RefundQueue } from './queues/refund.queue';
import { RefundProcessor } from './processors/refund.processor';
import { QueueMonitorController } from './controllers/queue-monitor.controller';
import { BullBoardSetup } from './config/bull-board.setup';
import { QueueHealthMonitor } from './services/queue-health-monitor.service';
import { NestExpressApplication } from '@nestjs/platform-express';

/**
 * Scheduler 模块
 *
 * 提供定时任务功能：
 * - 券模板销售期过期检查（每5分钟）
 * - 订单使用期过期自动退款（每10分钟，使用 BullMQ 队列）
 * - 未支付订单超时取消（每5分钟）
 *
 * BullMQ 队列配置：
 * - 退款队列（refund）：并发 3，符合微信 API 频率限制
 * - 自动重试机制（5 次，指数退避）
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    // BullMQ 配置（使用现有 Redis）
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : 0,
      },
    }),
    // 注册退款队列
    BullModule.registerQueue({
      name: 'refund',
    }),
    CouponModule,
  ],
  providers: [
    // 基础服务
    RedisService,
    WechatPayService,
    // BullMQ 队列服务
    RefundQueue,
    RefundProcessor, // 退款队列消费者（自动启动）
    // Bull Board 配置
    BullBoardSetup,
    // 队列健康监控
    QueueHealthMonitor,
    // 过期处理服务
    CouponTemplateExpirationService,
    OrderExpirationService,
    OrderCancellationService,
    // 定时任务
    CouponTemplateExpirationTask,
    OrderExpirationTask,
    OrderCancellationTask,
  ],
  controllers: [QueueMonitorController], // 队列监控端点
  exports: [
    CouponTemplateExpirationService,
    OrderExpirationService,
    OrderCancellationService,
    RefundQueue, // 导出队列供其他模块使用
    BullBoardSetup, // 导出 Bull Board 配置
  ],
})
export class SchedulerModule {}