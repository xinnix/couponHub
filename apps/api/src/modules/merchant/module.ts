import { Module } from '@nestjs/common';
import { MerchantController } from './rest/merchant.controller';
import { MerchantService } from './services/merchant.service';

@Module({
  controllers: [MerchantController],
  providers: [MerchantService],
  exports: [MerchantService],
})
export class MerchantModule {}