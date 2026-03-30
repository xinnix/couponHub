import { z } from 'zod';
import { protectedProcedure, router } from '../../../trpc/trpc';

/**
 * Payment tRPC Router
 *
 * Admin 端使用，查询支付相关状态。
 * 实际支付创建和回调通过 REST API 处理（小程序使用）。
 */
export const paymentRouter = router({
  /**
   * 查询订单支付状态（Admin 端）
   */
  queryPayment: protectedProcedure
    .input(z.object({ orderNo: z.string() }))
    .query(async ({ input, ctx }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { orderNo: input.orderNo },
      });

      if (!order) {
        throw new Error('订单不存在');
      }

      return {
        orderNo: order.orderNo,
        status: order.status,
        payId: order.payId,
        paidAt: order.paidAt,
        refundId: order.refundId,
        refundedAt: order.refundedAt,
      };
    }),
});
