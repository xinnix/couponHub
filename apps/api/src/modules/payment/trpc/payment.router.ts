import { z } from 'zod';
import { protectedProcedure, router } from '../../../trpc/trpc';

/**
 * 支付参数 Schema
 */
const CreatePaymentSchema = z.object({
  orderId: z.string().min(1, '订单ID不能为空'),
});

const RefundSchema = z.object({
  orderId: z.string().min(1, '订单ID不能为空'),
  reason: z.string().min(1, '退款原因不能为空'),
});

/**
 * Payment tRPC Router
 *
 * 提供支付相关接口：
 * - createPayment: 创建支付订单（模拟）
 * - refund: 发起退款（模拟）
 */
export const paymentRouter = router({
  /**
   * 创建支付订单（模拟）
   */
  createPayment: protectedProcedure
    .input(CreatePaymentSchema)
    .mutation(async ({ input, ctx }) => {
      const { orderId } = input;

      // 获取订单信息
      const order = await ctx.prisma.order.findUnique({
        where: { id: orderId },
        include: { template: true },
      });

      if (!order) {
        throw new Error('订单不存在');
      }

      // 验证订单状态
      if (order.status !== 'UNPAID') {
        throw new Error('订单状态异常');
      }

      // 模拟支付成功，更新订单状态
      const updated = await ctx.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          payId: `mock_pay_${Date.now()}`,
          paidAt: new Date(),
        },
      });

      return {
        success: true,
        order: updated,
      };
    }),

  /**
   * 发起退款（模拟）
   */
  refund: protectedProcedure
    .input(RefundSchema)
    .mutation(async ({ input, ctx }) => {
      const { orderId, reason } = input;

      const order = await ctx.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error('订单不存在');
      }

      // 验证订单状态
      if (order.status !== 'REFUNDING') {
        throw new Error('订单状态异常');
      }

      // 模拟退款成功，更新订单状态
      const updated = await ctx.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'REFUNDED',
          refundId: `mock_refund_${Date.now()}`,
          refundedAt: new Date(),
        },
      });

      return {
        success: true,
        order: updated,
      };
    }),
});