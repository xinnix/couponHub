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
}