import { Module, forwardRef } from '@nestjs/common';
import { PaymentModule } from '../payment/module';
import { CouponModule } from '../coupon/module';
import { RedisService } from '../../shared/services/redis.service';
import { OrderService } from './services/order.service';
import { OrderStateMachineService } from './services/order-state-machine.service';
import { OrderController } from './rest/order.controller';

@Module({
  imports: [forwardRef(() => PaymentModule), CouponModule],
  controllers: [OrderController],
  providers: [RedisService, OrderService, OrderStateMachineService],
  exports: [OrderService, OrderStateMachineService],
})
export class OrderModule {}
