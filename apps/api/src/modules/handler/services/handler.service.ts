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
   * 根据手机号查找核销员（包括已删除的）
   */
  async findByPhone(phone: string) {
    return this.prisma.handler.findFirst({
      where: { phone },
      include: { merchant: true },
    });
  }

  /**
   * 根据手机号查找活跃的核销员（只返回 isActive=true）
   */
  async findActiveByPhone(phone: string) {
    return this.prisma.handler.findFirst({
      where: {
        phone,
        isActive: true,
      },
      include: { merchant: true },
    });
  }

  /**
   * 查询商户的核销员列表（只返回活跃的核销员）
   */
  async getByMerchant(merchantId: string) {
    return this.prisma.handler.findMany({
      where: {
        merchantId,
        isActive: true, // 只返回活跃的核销员，过滤掉已删除的
      },
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
   * 创建核销员并关联同名手机号用户
   *
   * 业务规则：
   * - 手机号不能与当前活跃的核销员重复
   * - 如果手机号曾被软删除的核销员使用，允许重新注册（员工转岗场景）
   * - 创建后会自动关联手机号相同的用户
   */
  async createHandler(data: CreateHandler) {
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(data.phone)) {
      throw new Error('手机号格式不正确');
    }

    // 检查手机号是否已被当前活跃的核销员使用
    const existingActive = await this.findActiveByPhone(data.phone);
    if (existingActive) {
      throw new Error(`该手机号已被商户"${existingActive.merchant?.name || '未知'}"的核销员"${existingActive.name}"使用`);
    }

    // 检查商户是否存在
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: data.merchantId },
    });
    if (!merchant) {
      throw new Error('商户不存在');
    }

    const handler = await this.prisma.handler.create({
      data: {
        name: data.name,
        phone: data.phone,
        merchantId: data.merchantId,
        isActive: data.isActive ?? true,
      },
      include: { merchant: true },
    });

    // 关联同手机号的用户
    await this.linkUsersByPhone(handler.id, data.phone);

    return handler;
  }

  /**
   * 更新核销员，手机号变更时同步关联用户
   *
   * 业务规则：
   * - 手机号不能与其他活跃核销员重复
   * - 更新手机号时解除旧关联，建立新关联
   * - 软删除的核销员不影响手机号更新
   */
  async updateHandler(id: string, data: UpdateHandler) {
    // 如果更新手机号，验证格式和唯一性（只检查活跃的核销员）
    if (data.phone) {
      if (!/^1[3-9]\d{9}$/.test(data.phone)) {
        throw new Error('手机号格式不正确');
      }
      const existingActive = await this.prisma.handler.findFirst({
        where: {
          phone: data.phone,
          isActive: true,
          id: { not: id },
        },
      });
      if (existingActive) {
        throw new Error(`该手机号已被商户"${existingActive.merchantId}"的核销员"${existingActive.name}"使用`);
      }
    }

    // 如果手机号变更，先解除旧关联再建立新关联
    if (data.phone) {
      const oldHandler = await this.prisma.handler.findUnique({ where: { id } });
      if (oldHandler && oldHandler.phone !== data.phone) {
        // 解除旧手机号关联的用户
        await this.prisma.user.updateMany({
          where: { handlerId: id, phone: oldHandler.phone },
          data: { handlerId: null },
        });
      }
    }

    const handler = await this.prisma.handler.update({
      where: { id },
      data,
      include: { merchant: true },
    });

    // 关联新手机号对应的用户
    if (data.phone) {
      await this.linkUsersByPhone(id, data.phone);
    }

    return handler;
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
   *
   * 业务说明：
   * - 使用软删除而非硬删除，以保留历史订单数据的完整性
   * - 删除后核销员将从列表中消失（查询只显示 isActive=true）
   * - 解除与用户的关联，防止用户继续使用核销功能
   * - 历史订单记录仍可追溯到该核销员（Order.handlerId 不改变）
   */
  async deleteHandler(id: string) {
    // 解除关联用户
    await this.prisma.user.updateMany({
      where: { handlerId: id },
      data: { handlerId: null },
    });

    return this.prisma.handler.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * 根据手机号关联用户到核销员
   *
   * 业务说明：
   * - 查找所有手机号匹配的用户，关联到当前核销员
   * - 如果用户之前关联到软删除的核销员，会被重新关联到新核销员
   * - 支持多个用户关联到同一个核销员（例如：同一手机号可能有多个 User 账号）
   */
  private async linkUsersByPhone(handlerId: string, phone: string) {
    const users = await this.prisma.user.findMany({
      where: { phone },
    });
    if (users.length > 0) {
      await this.prisma.user.updateMany({
        where: { id: { in: users.map(u => u.id) } },
        data: { handlerId },
      });
    }
  }
}