import { Module } from '@nestjs/common';
import { TemplateController } from './rest/template.controller';
import { TemplateService } from './services/template.service';
import { StockLogService } from './services/stock-log.service';
import { WechatModule } from '../wechat/wechat.module';
import { FileStorageService } from '../../shared/services/file-storage.service';

@Module({
  imports: [WechatModule],
  controllers: [TemplateController],
  providers: [TemplateService, StockLogService, FileStorageService],
  exports: [TemplateService, StockLogService],
})
export class CouponModule {}