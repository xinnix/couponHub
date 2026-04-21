import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseService } from '../../../common/base.service';

@Injectable()
export class MerchantService extends BaseService<'Merchant'> {
  constructor(prisma: PrismaService) {
    super(prisma, 'Merchant');
  }

  /**
   * Override list method to handle search functionality
   * Search across multiple fields: name, phone
   */
  async list(args?: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
    include?: any;
    select?: any;
  }) {
    const where = { ...args?.where };

    // Handle search filter - search across name and phone
    if (where.search) {
      // Extract search term from nested object or direct value
      const searchTerm = where.search.contains || where.search;

      // Remove the original search field
      delete where.search;

      // Use OR to search in multiple fields
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Add default include for counts if not specified
    const include = args?.include || {
      category: true, // 关联查询类别
      _count: {
        select: {
          handlers: true,
          orders: true,
        },
      },
    };

    // Add default ordering by sortOrder (descending) if not specified
    // 数字越大越靠前（降序）
    const orderBy = args?.orderBy || [
      { sortOrder: 'desc' },
      { createdAt: 'desc' },
    ];

    return super.list({
      ...args,
      where,
      include,
      orderBy,
    });
  }

  /**
   * 获取所有商户分类
   */
  async getCategories() {
    const categories = await this.prisma.merchantCategory.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: [
        { sortOrder: 'desc' }, // 数字越大越靠前（降序）
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        description: true,
        sortOrder: true,
      },
    });

    return categories;
  }
}