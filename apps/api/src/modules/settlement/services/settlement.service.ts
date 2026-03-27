import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseService } from '../../../common/base.service';

@Injectable()
export class SettlementService extends BaseService<'Settlement'> {
  constructor(prisma: PrismaService) {
    super(prisma, 'Settlement');
  }
}