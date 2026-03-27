import { z } from 'zod';
import { protectedProcedure, router } from '../../../trpc/trpc';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { verifyRedeemCode } from '../../../shared/utils/qrcode.util';

/**
 * 核销 Schemas
 */
const RedeemSchema = z.object({
  code: z.string().min(1, '二维码内容不能为空'),
});

const GetRecordsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});

/**
 * Redemption tRPC Router
 *
 * 核销管理路由，提供：
 * - redeem: 扫码核销
 * - getRecords: 查询核销记录
 */
export const redemptionRouter = router({
  /**
   * 扫码核销
   */
  redeem: protectedProcedure
    .input(RedeemSchema)
    .mutation(async ({ input, ctx }) => {
      const { code } = input;

      // 1. 解析二维码
      const { orderId, valid, reason } = verifyRedeemCode(code);

      if (!valid) {
        throw new BadRequestException(reason || '二维码无效');
      }

      // 2. 获取订单信息
      const order = await ctx.prisma.order.findUnique({
        where: { id: orderId },
        include: { template: true },
      });

      if (!order) {
        throw new BadRequestException('订单不存在');
      }

      // 3. 验证订单状态
      if (order.status !== 'PAID') {
        throw new BadRequestException(`订单状态异常: ${order.status}`);
      }

      // 4. 检查是否已核销（幂等性）
      if (order.redeemedAt) {
        throw new BadRequestException('该订单已核销');
      }

      // TODO: 验证核销员权限
      // const merchantScope = order.template.merchantScope as string[];
      // if (!merchantScope.includes(handler.merchantId)) {
      //   throw new ForbiddenException('该券不适用于当前商户');
      // }

      // 5. 更新订单状态
      const updated = await ctx.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'REDEEMED',
          // redeemMerchantId: handler.merchantId, // TODO: 从核销员信息获取
          redeemedAt: new Date(),
        },
        include: {
          template: true,
          user: {
            select: {
              id: true,
              nickname: true,
              phone: true,
            },
          },
        },
      });

      return updated;
    }),

  /**
   * 查询核销记录
   */
  getRecords: protectedProcedure
    .input(GetRecordsSchema)
    .query(async ({ input, ctx }) => {
      const { startDate, endDate, page = 1, pageSize = 20 } = input;

      // TODO: 从用户信息中获取商户 ID
      // const merchantId = ...;

      const where: any = {
        status: 'REDEEMED',
        redeemedAt: { not: null },
      };

      if (startDate || endDate) {
        where.redeemedAt = {};
        if (startDate) {
          where.redeemedAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.redeemedAt.lte = new Date(endDate);
        }
      }

      const [records, total] = await Promise.all([
        ctx.prisma.order.findMany({
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
          },
          orderBy: { redeemedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        ctx.prisma.order.count({ where }),
      ]);

      return {
        data: records,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),
});