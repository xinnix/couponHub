import { Module } from '@nestjs/common';
import { RedemptionService } from './services/redemption.service';
import { RedemptionController } from './rest/redemption.controller';

@Module({
  controllers: [RedemptionController],
  providers: [RedemptionService],
  exports: [RedemptionService],
})
export class RedemptionModule {}
