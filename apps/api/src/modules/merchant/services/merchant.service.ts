import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseService } from '../../../common/base.service';

@Injectable()
export class MerchantService extends BaseService<'Merchant'> {
  constructor(prisma: PrismaService) {
    super(prisma, 'Merchant');
  }
}