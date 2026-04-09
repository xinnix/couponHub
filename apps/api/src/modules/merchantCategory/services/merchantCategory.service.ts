import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseService } from '../../../common/base.service';

@Injectable()
export class MerchantCategoryService extends BaseService<'MerchantCategory'> {
  constructor(prisma: PrismaService) {
    super(prisma, 'MerchantCategory');
  }

  // 覆写 list 方法：支持搜索和商户统计
  async list(args?: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
    include?: any;
  }) {
    const where = { ...args?.where };

    // 搜索逻辑
    if (where.search) {
      const searchTerm = where.search.contains || where.search;
      delete where.search;

      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { slug: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // 默认按 sortOrder 升序排序
    const orderBy = args?.orderBy || { sortOrder: 'asc' };

    // 包含商户统计
    const include = args?.include || {
      _count: {
        select: {
          merchants: true,
        },
      },
    };

    return super.list({ ...args, where, orderBy, include });
  }
}