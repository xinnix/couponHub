import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { verifyRedeemCode } from '../../../shared/utils/qrcode.util';

/**
 * 核销服务
 *
 * 处理商户扫码核销逻辑：
 * - 解析二维码
 * - 验证权限
 * - 更新订单状态
 */
@Injectable()
export class RedemptionService {
  private readonly logger = new Logger(RedemptionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 扫码核销
   *
   * 流程：
   * 1. 解析二维码
   * 2. 验证时效性
   * 3. 获取订单信息
   * 4. 验证订单状态
   * 5. 验证核销员权限
   * 6. 更新订单状态
   *
   * @param handlerId 核销员 ID
   * @param code 二维码内容
   */
  async redeemOrder(handlerId: string, code: string) {
    // 1. 解析二维码
    const { orderId, valid, reason } = verifyRedeemCode(code);

    if (!valid) {
      throw new BadRequestException(reason || '二维码无效');
    }

    // 2. 获取核销员信息
    const handler = await this.prisma.handler.findUnique({
      where: { id: handlerId },
      include: { merchant: true },
    });

    if (!handler || !handler.isActive) {
      throw new ForbiddenException('核销员不存在或已被禁用');
    }

    // 3. 获取订单信息
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { template: true },
    });

    if (!order) {
      throw new BadRequestException('订单不存在');
    }

    // 4. 验证订单状态
    if (order.status !== 'PAID') {
      throw new BadRequestException(`订单状态异常: ${order.status}`);
    }

    // 5. 检查是否在使用期内
    const now = new Date();
    if (order.template.useFrom > now) {
      throw new BadRequestException(`该券尚未开始使用，使用开始时间: ${order.template.useFrom.toLocaleString()}`);
    }
    if (order.template.useUntil < now) {
      throw new BadRequestException('该券已超过使用截止时间，无法核销');
    }

    // 6. 检查订单是否过期（使用订单的 expireAt 字段）
    if (order.expireAt && new Date(order.expireAt) < new Date()) {
      throw new BadRequestException('该券已过期，无法核销');
    }

    // 7. 验证核销权限
    const merchantScope = order.template.merchantScope as string[];
    // 空数组表示全商户可用
    if (merchantScope.length > 0 && !merchantScope.includes(handler.merchantId)) {
      throw new ForbiddenException('该券不适用于当前商户');
    }

    // 6. 检查是否已核销（幂等性）
    if (order.redeemedAt) {
      throw new BadRequestException('该订单已核销');
    }

    // 7. 更新订单状态
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REDEEMED',
        redeemMerchantId: handler.merchantId,
        handlerId: handler.id, // 记录核销员 ID
        redeemedAt: new Date(),
      },
      include: {
        template: true,
        merchant: true,
        user: true,
        handler: true, // 包含核销员信息
      },
    });

    this.logger.log(
      `核销成功: 订单 ${order.orderNo}, 商户 ${handler.merchant.name}, 核销员 ${handler.name}`,
    );

    return updated;
  }

  /**
   * 查询核销记录
   *
   * @param merchantId 商户 ID
   * @param params 查询参数
   */
  async getRedemptionRecords(
    merchantId: string,
    params?: {
      startDate?: Date;
      endDate?: Date;
      page?: number;
      pageSize?: number;
    },
  ) {
    const { startDate, endDate, page = 1, pageSize = 20 } = params || {};

    const where: any = { redeemMerchantId: merchantId };

    if (startDate || endDate) {
      where.redeemedAt = {};
      if (startDate) {
        where.redeemedAt.gte = startDate;
      }
      if (endDate) {
        where.redeemedAt.lte = endDate;
      }
    }

    const [records, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          template: true,
          user: {
            select: {
              id: true,
              nickname: true,
              phone: true,
            },
          },
          handler: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { redeemedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}