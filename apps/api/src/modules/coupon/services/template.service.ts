import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseService } from '../../../common/base.service';

@Injectable()
export class TemplateService extends BaseService<'CouponTemplate'> {
  constructor(prisma: PrismaService) {
    super(prisma, 'CouponTemplate');
  }
}