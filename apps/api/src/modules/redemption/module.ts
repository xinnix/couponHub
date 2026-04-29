import { Module } from '@nestjs/common';
import { RedemptionService } from './services/redemption.service';
import { RedemptionController } from './rest/redemption.controller';
import { RedisService } from '../../shared/services/redis.service';

@Module({
  controllers: [RedemptionController],
  providers: [RedisService, RedemptionService],
  exports: [RedemptionService],
})
export class RedemptionModule {}
