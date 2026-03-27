import { Module } from '@nestjs/common';
import { NewsController } from './rest/news.controller';
import { NewsService } from './services/news.service';

@Module({
  controllers: [NewsController],
  providers: [NewsService],
  exports: [NewsService],
})
export class NewsModule {}