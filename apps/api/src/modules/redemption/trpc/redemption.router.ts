import { z } from 'zod';
import { protectedProcedure, permissionProcedure, router } from '../../../trpc/trpc';
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
  merchantId: z.string().optional(), // 新增：支持按商户筛选
  templateId: z.string().optional(), // 新增：支持按优惠券筛选
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
});

const GetManySchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().optional().default(20),
  where: z.any().optional(),
  orderBy: z.any().optional(),
  include: z.any().optional(),
});

/**
 * Redemption tRPC Router
 *
 * 核销管理路由，提供：
 * - getMany: 标准列表查询（兼容 Refine）
 * - redeem: 扫码核销
 * - getRecords: 查询核销记录（自定义筛选）
 */
export const redemptionRouter = router({
  /**
   * 核销统计（支持筛选条件，聚合所有页）
   */
  getStats: protectedProcedure
    .input(z.object({
      merchantId: z.string().optional(),
      templateId: z.string().optional(), // 新增：支持按优惠券筛选
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional().default({}))
    .query(async ({ input, ctx }) => {
      const where: any = {
        status: 'REDEEMED',
        redeemedAt: { not: null },
      };

      if (input.merchantId) where.redeemMerchantId = input.merchantId;
      if (input.templateId) where.templateId = input.templateId; // 新增：支持按优惠券筛选
      if (input.dateFrom || input.dateTo) {
        where.redeemedAt = {
          ...(input.dateFrom ? { gte: new Date(input.dateFrom) } : {}),
          ...(input.dateTo ? { lte: new Date(input.dateTo) } : {}),
        };
      }

      const [agg, merchantAgg] = await Promise.all([
        ctx.prisma.order.aggregate({
          where,
          _count: true,
          _sum: { price: true, faceValue: true },
        }),
        ctx.prisma.order.findMany({
          where,
          select: { redeemMerchantId: true, templateId: true },
        }),
      ]);

      // 商户去重
      const merchantCount = new Set(merchantAgg.map((r) => r.redeemMerchantId).filter(Boolean)).size;

      // 结算总额需要查 template.settlementAmount
      const templateIds = [...new Set(merchantAgg.map((r) => r.templateId))];
      const templates = await ctx.prisma.couponTemplate.findMany({
        where: { id: { in: templateIds } },
        select: { id: true, settlementAmount: true, faceValue: true },
      });
      const templateMap = new Map<string, { settlementAmount: any; faceValue: any }>(
        templates.map((t: any) => [t.id, { settlementAmount: t.settlementAmount, faceValue: t.faceValue }]),
      );

      // 按 templateId 分组统计订单数，用于计算结算总额
      const ordersByTemplate = new Map<string, number>();
      for (const r of merchantAgg) {
        ordersByTemplate.set(r.templateId, (ordersByTemplate.get(r.templateId) || 0) + 1);
      }
      let totalSettlement = 0;
      for (const [templateId, count] of ordersByTemplate) {
        const tpl = templateMap.get(templateId);
        if (tpl) {
          const perSettlement = tpl.settlementAmount ? Number(tpl.settlementAmount) : Number(tpl.faceValue);
          totalSettlement += perSettlement * count;
        }
      }

      return {
        count: agg._count,
        totalPrice: Number(agg._sum.price ?? 0),
        totalFaceValue: Number(agg._sum.faceValue ?? 0),
        totalSettlement,
        merchantCount,
      };
    }),

  /**
   * 标准列表查询（兼容 Refine dataProvider）
   * 默认查询已核销订单
   */
  getMany: protectedProcedure
    .input(GetManySchema)
    .query(async ({ input, ctx }) => {
      const { page = 1, limit = 20, where, orderBy, include } = input;

      // 构建查询条件：默认查询已核销订单
      const baseWhere = {
        status: 'REDEEMED',
        redeemedAt: { not: null },
      };

      // 合并用户传入的 where 条件
      const finalWhere = where ? { ...baseWhere, ...where } : baseWhere;

      const [items, total] = await Promise.all([
        ctx.prisma.order.findMany({
          where: finalWhere,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: orderBy || { redeemedAt: 'desc' },
          include: include || {
            template: true,
            merchant: {
              include: {
                category: true, // 包含商户分类信息
              },
            },
            user: {
              select: {
                id: true,
                nickname: true,
                phone: true,
              },
            },
          },
        }),
        ctx.prisma.order.count({ where: finalWhere }),
      ]);

      return {
        items,
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      };
    }),

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

      // 4. 检查是否在使用期内
      const now = new Date();
      const fmt = (d: Date) => d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
      if (order.template.useFrom > now) {
        throw new BadRequestException(`该券尚未开始使用，使用开始时间: ${fmt(order.template.useFrom)}`);
      }
      if (order.template.useUntil < now) {
        throw new BadRequestException('该券已超过使用截止时间，无法核销');
      }

      // 5. 检查订单是否过期（相对有效期）
      if (order.expireAt && new Date(order.expireAt) < now) {
        throw new BadRequestException('该券已过期，无法核销');
      }

      // 6. 检查是否已核销（幂等性）
      if (order.redeemedAt) {
        throw new BadRequestException('该订单已核销');
      }

      // 5. 获取核销员信息
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.user.id },
        include: {
          handler: {
            include: {
              merchant: true,
            },
          },
        },
      });

      if (!user || !user.handler) {
        throw new ForbiddenException('您不是核销员，无法执行核销操作');
      }

      const handler = user.handler;

      // 6. 验证商户范围
      const merchantScope = order.template.merchantScope;
      if (merchantScope && Array.isArray(merchantScope)) {
        if (!merchantScope.includes(handler.merchantId)) {
          throw new ForbiddenException('该券不适用于当前商户');
        }
      }

      // 7. 更新订单状态
      const updated = await ctx.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'REDEEMED',
          redeemMerchantId: handler.merchantId,
          handlerId: handler.id,
          redeemedAt: new Date(),
        },
        include: {
          template: true,
          merchant: true,
          handler: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
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
   * 核销记录查询
   */
  getRecords: protectedProcedure
    .input(GetRecordsSchema)
    .query(async ({ input, ctx }) => {
      const { startDate, endDate, merchantId, templateId, page = 1, pageSize = 20 } = input;

      const where: any = {
        status: 'REDEEMED',
        redeemedAt: { not: null },
      };

      // 根据用户类型筛选
      // Admin 用户可以查询所有记录，并支持按商户筛选
      if ((ctx.user as any).type === 'admin') {
        if (merchantId) {
          where.redeemMerchantId = merchantId;
        }
      } else {
        // 核销员：获取用户关联的核销员信息
        const user = await ctx.prisma.user.findUnique({
          where: { id: ctx.user.id },
          include: {
            handler: true,
          },
        });

        if (user && user.handler) {
          // 核销员只能查询自己商户的记录
          where.redeemMerchantId = user.handler.merchantId;
        } else if (merchantId) {
          // 如果传入了 merchantId 参数，也支持筛选（兼容性）
          where.redeemMerchantId = merchantId;
        }
      }

      // 新增：按优惠券筛选
      if (templateId) {
        where.templateId = templateId;
      }

      // 日期范围筛选
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
            merchant: {
              include: {
                category: true, // 包含商户分类信息
              },
            },
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

  /**
   * 订单号核销（管理端）
   * 管理员手动输入订单号进行核销，需要选择核销门店和核销员
   */
  redeemByOrderNo: permissionProcedure('order', 'update')
    .input(z.object({
      orderNo: z.string().min(1, '订单号不能为空'),
      merchantId: z.string().min(1, '请选择核销门店'),
      handlerId: z.string().min(1, '请选择核销员'),
    }))
    .mutation(async ({ input, ctx }) => {
      const { orderNo, merchantId, handlerId } = input;

      // 1. 查询订单
      const order = await ctx.prisma.order.findUnique({
        where: { orderNo },
        include: { template: true },
      });

      if (!order) {
        throw new BadRequestException('订单不存在');
      }

      // 2. 验证订单状态（必须是已支付）
      if (order.status !== 'PAID') {
        throw new BadRequestException(`订单状态异常: ${order.status}，无法核销`);
      }

      // 3. 检查是否已核销（幂等性）
      if (order.redeemedAt) {
        throw new BadRequestException('该订单已核销');
      }

      // 4. 检查使用期限
      const now = new Date();
      const fmt = (d: Date) => d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

      if (order.template.useFrom > now) {
        throw new BadRequestException(`该券尚未开始使用，使用开始时间: ${fmt(order.template.useFrom)}`);
      }
      if (order.template.useUntil < now) {
        throw new BadRequestException('该券已超过使用截止时间，无法核销');
      }

      // 5. 检查订单是否过期（相对有效期）
      if (order.expireAt && new Date(order.expireAt) < now) {
        throw new BadRequestException('该券已过期，无法核销');
      }

      // 6. 获取核销员信息并验证
      const handler = await ctx.prisma.handler.findUnique({
        where: { id: handlerId },
        include: { merchant: true },
      });

      if (!handler) {
        throw new ForbiddenException('核销员不存在');
      }

      if (!handler.isActive) {
        throw new ForbiddenException('核销员已被禁用，无法执行核销操作');
      }

      if (handler.merchantId !== merchantId) {
        throw new ForbiddenException('核销员不属于所选商户');
      }

      // 7. 验证商户范围权限
      const merchantScope = order.template.merchantScope as string[];
      if (merchantScope && merchantScope.length > 0 && !merchantScope.includes(merchantId)) {
        throw new ForbiddenException('该券不适用于当前商户');
      }

      // 8. 使用分布式锁保护核销操作（防止并发）
      const lockKey = `redemption:${order.id}`;
      const lock = await ctx.redisService.acquireLock(lockKey, 10000, 3, 100);

      if (!lock) {
        throw new BadRequestException('订单正在被处理，请稍后重试');
      }

      try {
        // 9. 在锁内重新检查是否已核销（防止并发攻击）
        const lockedOrder = await ctx.prisma.order.findUnique({
          where: { id: order.id },
        });

        if (lockedOrder && lockedOrder.redeemedAt) {
          throw new BadRequestException('该订单已核销');
        }

        // 10. 更新订单状态（核销成功）
        const updated = await ctx.prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'REDEEMED',
            redeemMerchantId: merchantId,
            handlerId: handlerId,
            redeemedAt: new Date(),
          },
          include: {
            template: true,
            merchant: {
              include: {
                category: true,
              },
            },
            handler: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
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
      } finally {
        // 11. 释放锁
        await ctx.redisService.releaseLock(lockKey, lock);
      }
    }),
});