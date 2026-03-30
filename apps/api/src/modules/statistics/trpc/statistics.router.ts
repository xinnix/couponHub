import { router, protectedProcedure } from '../../../trpc/trpc';
import { z } from 'zod';

export const statisticsRouter = router({
  // 总览数据 -- 核心卡片 + 订单状态分布 + 商户分类分布
  getOverview: protectedProcedure
    .input(
      z
        .object({
          days: z.number().int().positive().optional().default(30),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const days = input?.days ?? 30;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const [
        userCount,
        merchantCount,
        orderStats,
        recentOrderStats,
        orderStatusGroup,
        couponStats,
        settlementStats,
        merchantCategoryGroup,
      ] = await Promise.all([
        // 用户总数
        ctx.prisma.user.count(),

        // 活跃商户数
        ctx.prisma.merchant.count({ where: { status: 'ACTIVE' } }),

        // 全部订单统计
        ctx.prisma.order.aggregate({
          _count: true,
          _sum: { price: true, faceValue: true },
        }),

        // 近 N 天有效订单统计
        ctx.prisma.order.aggregate({
          where: {
            status: { in: ['PAID', 'REDEEMED', 'REFUNDING', 'REFUNDED'] },
            paidAt: { gte: since },
          },
          _count: true,
          _sum: { price: true },
        }),

        // 订单状态分布
        ctx.prisma.order.groupBy({
          by: ['status'],
          _count: true,
          _sum: { price: true },
        }),

        // 券模板统计
        ctx.prisma.couponTemplate.aggregate({
          _count: true,
          _sum: { stock: true },
          where: { status: 'ACTIVE' },
        }),

        // 待结算统计
        ctx.prisma.settlement.aggregate({
          _count: true,
          _sum: { totalAmount: true },
          where: { status: 'PENDING' },
        }),

        // 商户分类分布
        ctx.prisma.merchant.groupBy({
          by: ['category'],
          where: { status: 'ACTIVE' },
          _count: true,
        }),
      ]);

      return {
        // 核心指标
        userCount,
        merchantCount,
        totalOrders: orderStats._count,
        totalRevenue: Number(orderStats._sum.price ?? 0),
        recentOrders: recentOrderStats._count,
        recentRevenue: Number(recentOrderStats._sum.price ?? 0),
        activeCouponTemplates: couponStats._count,
        totalStock: Number(couponStats._sum.stock ?? 0),
        pendingSettlements: settlementStats._count,
        pendingSettlementAmount: Number(settlementStats._sum.totalAmount ?? 0),

        // 分布数据
        orderStatusDistribution: orderStatusGroup.map((g) => ({
          status: g.status,
          count: g._count,
          amount: Number(g._sum.price ?? 0),
        })),
        merchantCategoryDistribution: merchantCategoryGroup.map((g) => ({
          category: g.category,
          count: g._count,
        })),
      };
    }),

  // 订单趋势 -- 最近 N 天的订单数 + 交易额
  getOrderTrend: protectedProcedure
    .input(
      z.object({
        days: z.number().int().positive().optional().default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const days = input.days;
      const since = new Date();
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);

      const orders = await ctx.prisma.order.findMany({
        where: {
          status: { in: ['PAID', 'REDEEMED', 'REFUNDING', 'REFUNDED'] },
          createdAt: { gte: since },
        },
        select: {
          createdAt: true,
          price: true,
          status: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      // 应用层按天聚合
      const dailyMap = new Map<
        string,
        { date: string; orderCount: number; revenue: number; redeemedCount: number }
      >();

      for (let i = 0; i < days; i++) {
        const d = new Date(since);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        dailyMap.set(key, { date: key, orderCount: 0, revenue: 0, redeemedCount: 0 });
      }

      for (const order of orders) {
        const key = order.createdAt.toISOString().slice(0, 10);
        const entry = dailyMap.get(key);
        if (entry) {
          entry.orderCount += 1;
          entry.revenue += Number(order.price);
          if (order.status === 'REDEEMED') {
            entry.redeemedCount += 1;
          }
        }
      }

      return Array.from(dailyMap.values());
    }),

  // 最近订单
  getRecentOrders: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().positive().optional().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.order.findMany({
        take: input.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNo: true,
          status: true,
          price: true,
          faceValue: true,
          createdAt: true,
          user: { select: { nickname: true, email: true } },
          template: { select: { title: true } },
          merchant: { select: { name: true } },
        },
      });
    }),
});
