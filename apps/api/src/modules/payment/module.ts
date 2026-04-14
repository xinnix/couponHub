import { Module, forwardRef } from '@nestjs/common';
import { WechatPayService } from './services/wechat-pay.service';
import { PaymentController } from './rest/payment.controller';
import { OrderModule } from '../order/module';

@Module({
  imports: [forwardRef(() => OrderModule)],
  controllers: [PaymentController],
  providers: [WechatPayService],
  exports: [WechatPayService],
})
export class PaymentModule {}
