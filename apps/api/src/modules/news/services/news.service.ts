import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseService } from '../../../common/base.service';

@Injectable()
export class NewsService extends BaseService<'News'> {
  constructor(prisma: PrismaService) {
    super(prisma, 'News');
  }

  /**
   * 创建前检查：如果设置为弹窗且状态为发布，确保没有其他发布状态的弹窗新闻
   */
  protected async beforeCreate(data: any): Promise<any> {
    if (data.isPopup === true && data.status === 'PUBLISHED') {
      const existingPopup = await this.prisma.news.findFirst({
        where: {
          isPopup: true,
          status: 'PUBLISHED',
        },
      });

      if (existingPopup) {
        throw new BadRequestException(
          `已存在发布状态的弹窗新闻：${existingPopup.title}，请先取消该新闻的弹窗设置或将其改为草稿状态`,
        );
      }
    }
    return data;
  }

  /**
   * 更新前处理：如果启用弹窗且状态为发布，自动取消其他发布状态的弹窗新闻
   */
  protected async beforeUpdate(id: string, data: any): Promise<any> {
    if (data.isPopup === true && data.status === 'PUBLISHED') {
      const currentPopup = await this.prisma.news.findFirst({
        where: {
          isPopup: true,
          status: 'PUBLISHED',
          id: { not: id },
        },
      });

      if (currentPopup) {
        await this.prisma.$transaction([
          this.prisma.news.update({
            where: { id: currentPopup.id },
            data: { isPopup: false },
          }),
        ]);
      }
    }
    return data;
  }

  /**
   * 获取当前的弹窗新闻（小程序端使用）
   */
  async getPopupNews() {
    return this.model.findFirst({
      where: {
        isPopup: true,
        status: 'PUBLISHED',
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  /**
   * 获取新闻详情（包含关联的优惠券）- 小程序端使用
   * 过滤条件：status='ACTIVE' 且 validFrom<=now
   */
  async getNewsWithCoupons(id: string) {
    const news = await this.model.findUnique({
      where: { id },
      include: {
        coupons: {
          include: {
            coupon: {
              select: {
                id: true,
                title: true,
                buyPrice: true,
                faceValue: true,
                description: true,
                status: true,
                validFrom: true,
                stock: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!news) return null;

    // 应用状态过滤（静默过滤，不返回提示）
    const filteredCoupons = this.filterCouponsByStatus(news.coupons as any[]);

    return {
      ...news,
      coupons: filteredCoupons,
    };
  }

  /**
   * 获取新闻详情（包含关联的优惠券）- Admin端使用
   * 显示所有关联的优惠券（不过滤），方便管理员管理
   */
  async getNewsWithCouponsForAdmin(id: string) {
    const news = await this.model.findUnique({
      where: { id },
      include: {
        coupons: {
          include: {
            coupon: true, // Admin端返回完整信息
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return news;
  }

  /**
   * 状态过滤逻辑（小程序端）：
   * - status = 'ACTIVE'
   * - validFrom <= now（购买已开始）
   */
  private filterCouponsByStatus(relations: any[]) {
    const now = new Date();

    return relations.filter((r) => {
      const isActive = r.coupon.status === 'ACTIVE';
      const hasStarted = new Date(r.coupon.validFrom) <= now;
      return isActive && hasStarted;
    });
  }

  /**
   * 创建新闻时关联优惠券
   */
  async createWithCoupons(data: any, userId?: string) {
    const { couponIds, ...newsData } = data;

    // 创建新闻
    const news = await this.model.create({
      data: {
        ...newsData,
        createdById: userId,
        updatedById: userId,
      },
    });

    // 创建优惠券关联
    if (couponIds && couponIds.length > 0) {
      await this.createCouponRelations(news.id, couponIds);
    }

    return news;
  }

  /**
   * 更新新闻时更新优惠券关联
   */
  async updateWithCoupons(id: string, data: any, userId?: string) {
    const { couponIds, ...newsData } = data;

    // 更新新闻基本信息
    const news = await this.model.update({
      where: { id },
      data: {
        ...newsData,
        updatedById: userId,
      },
    });

    // 更新优惠券关联
    if (couponIds !== undefined) {
      // 1. 删除旧的关联
      await this.prisma.newsCouponRelation.deleteMany({
        where: { newsId: id },
      });

      // 2. 创建新的关联
      if (couponIds.length > 0) {
        await this.createCouponRelations(id, couponIds);
      }
    }

    return news;
  }

  /**
   * 创建优惠券关联记录
   */
  private async createCouponRelations(newsId: string, couponIds: string[]) {
    await this.prisma.newsCouponRelation.createMany({
      data: couponIds.map((couponId) => ({
        newsId,
        couponId,
      })),
    });
  }
}