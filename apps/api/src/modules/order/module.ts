import { Module } from '@nestjs/common';
import { PaymentModule } from '../payment/module';
import { RedisService } from '../../shared/services/redis.service';
import { OrderService } from './services/order.service';
import { OrderStateMachineService } from './services/order-state-machine.service';
import { OrderController } from './rest/order.controller';

@Module({
  imports: [PaymentModule],
  controllers: [OrderController],
  providers: [RedisService, OrderService, OrderStateMachineService],
  exports: [OrderService, OrderStateMachineService],
})
export class OrderModule {}
