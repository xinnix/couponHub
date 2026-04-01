import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseService } from '../../../common/base.service';
import { CreateHandler, UpdateHandler } from '@opencode/shared';

@Injectable()
export class HandlerService extends BaseService<'Handler'> {
  constructor(prisma: PrismaService) {
    super(prisma, 'Handler');
  }

  /**
   * 根据手机号查找核销员
   */
  async findByPhone(phone: string) {
    return this.prisma.handler.findUnique({
      where: { phone },
      include: { merchant: true },
    });
  }

  /**
   * 查询商户的核销员列表
   */
  async getByMerchant(merchantId: string) {
    return this.prisma.handler.findMany({
      where: { merchantId },
      include: {
        users: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 创建核销员
   */
  async createHandler(data: CreateHandler) {
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(data.phone)) {
      throw new Error('手机号格式不正确');
    }

    // 检查手机号是否已存在
    const existing = await this.findByPhone(data.phone);
    if (existing) {
      throw new Error('该手机号已被注册为核销员');
    }

    // 检查商户是否存在
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: data.merchantId },
    });
    if (!merchant) {
      throw new Error('商户不存在');
    }

    return this.prisma.handler.create({
      data: {
        name: data.name,
        phone: data.phone,
        merchantId: data.merchantId,
        isActive: data.isActive ?? true,
      },
      include: { merchant: true },
    });
  }

  /**
   * 更新核销员
   */
  async updateHandler(id: string, data: UpdateHandler) {
    // 如果更新手机号，验证格式和唯一性
    if (data.phone) {
      if (!/^1[3-9]\d{9}$/.test(data.phone)) {
        throw new Error('手机号格式不正确');
      }
      const existing = await this.prisma.handler.findFirst({
        where: { phone: data.phone, id: { not: id } },
      });
      if (existing) {
        throw new Error('该手机号已被其他核销员使用');
      }
    }

    return this.prisma.handler.update({
      where: { id },
      data,
      include: { merchant: true },
    });
  }

  /**
   * 切换核销员状态
   */
  async toggleActive(id: string) {
    const handler = await this.prisma.handler.findUnique({ where: { id } });
    if (!handler) {
      throw new Error('核销员不存在');
    }
    return this.prisma.handler.update({
      where: { id },
      data: { isActive: !handler.isActive },
    });
  }

  /**
   * 删除核销员（软删除：设置 isActive = false）
   */
  async deleteHandler(id: string) {
    return this.prisma.handler.update({
      where: { id },
      data: { isActive: false },
    });
  }
}