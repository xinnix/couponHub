import { Module } from '@nestjs/common';
import { NewsController } from './rest/news.controller';
import { NewsService } from './services/news.service';
import { WechatModule } from '../wechat/wechat.module';
import { FileStorageService } from '../../shared/services/file-storage.service';

@Module({
  imports: [
    WechatModule,       // 新增：用于生成小程序码
  ],
  controllers: [NewsController],
  providers: [NewsService, FileStorageService],  // 新增：FileStorageService
  exports: [NewsService],
})
export class NewsModule {}