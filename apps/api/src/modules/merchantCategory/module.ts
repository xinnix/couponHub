import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MerchantCategoryService } from './services/merchantCategory.service';

@Module({
  imports: [PrismaModule],
  providers: [MerchantCategoryService],
  exports: [MerchantCategoryService],
})
export class MerchantCategoryModule {}