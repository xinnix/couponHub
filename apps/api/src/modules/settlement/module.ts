import { Module } from '@nestjs/common';
import { SettlementService } from './services/settlement.service';

@Module({
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
