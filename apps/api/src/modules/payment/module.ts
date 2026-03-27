import { Module } from '@nestjs/common';
import { WechatPayService } from './services/wechat-pay.service';
import { PaymentController } from './rest/payment.controller';

@Module({
  controllers: [PaymentController],
  providers: [WechatPayService],
  exports: [WechatPayService],
})
export class PaymentModule {}
