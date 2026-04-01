import { Module } from '@nestjs/common';
import { HandlerService } from './services/handler.service';

@Module({
  providers: [HandlerService],
  exports: [HandlerService],
})
export class HandlerModule {}