import { Module } from '@nestjs/common';
import { TemplateController } from './rest/template.controller';
import { TemplateService } from './services/template.service';

@Module({
  controllers: [TemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class CouponModule {}