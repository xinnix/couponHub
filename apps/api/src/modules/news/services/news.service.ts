import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseService } from '../../../common/base.service';

@Injectable()
export class NewsService extends BaseService<'News'> {
  constructor(prisma: PrismaService) {
    super(prisma, 'News');
  }
}