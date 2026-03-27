import {
  CreateOrderSchema,
  OrderListQuerySchema,
  RefundOrderSchema,
} from '@opencode/shared';
import { createCrudRouterWithCustom } from '../../../trpc/trpc.helper';
import { protectedProcedure } from '../../../trpc/trpc';
import { z } from 'zod';
import { ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';

/**
 * 生成订单号
 */
function generateOrderNo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

  return `${year}${month}${day}${hour}${minute}${second}${random}`;
}

/**
 * Order tRPC Router
 *
 * 订单管理路由，提供标准 CRUD 操作和自定义接口。
 */
export const orderRouter = createCrudRouterWithCustom(
  'Order',
  {
    getMany: OrderListQuerySchema,
  },
  (t) => ({
    // 创建订单
    createOrder: protectedProcedure
      .input(CreateOrderSchema)
      .mutation(async ({ input, ctx }) => {
        const { templateId } = input;
        const userId = ctx.user.id;

        // 1. 查询券模板
        const template = await ctx.prisma.couponTemplate.findUnique({
          where: { id: templateId },
        });

        if (!template) {
          throw new BadRequestException('券模板不存在');
        }

        // 2. 检查有效期
        const now = new Date();
        if (template.validFrom > now || template.validUntil < now) {
          throw new BadRequestException('该券不在有效期内');
        }

        // 3. 检查库存
        if (template.stock <= 0) {
          throw new ConflictException('库存不足');
        }

        // 4. 生成订单号
        const orderNo = generateOrderNo();

        // 5. 创建订单并扣减库存（事务）
        const order = await ctx.prisma.$transaction(async (tx) => {
          // 创建订单
          const newOrder = await tx.order.create({
            data: {
              orderNo,
              userId,
              templateId,
              status: 'UNPAID',
              price: template.buyPrice,
              faceValue: template.faceValue,
            },
            include: {
              template: true,
            },
          });

          // 扣减库存
          await tx.couponTemplate.update({
            where: { id: templateId },
            data: { stock: { decrement: 1 } },
          });

          return newOrder;
        });

        return { order };
      }),

    // 我的券包
    getMyOrders: protectedProcedure
      .input(z.object({ status: z.string().optional() }))
      .query(async ({ input, ctx }) => {
        const { status } = input;
        const userId = ctx.user.id;

        const where: any = { userId };
        if (status) {
          where.status = status;
        }

        const orders = await ctx.prisma.order.findMany({
          where,
          include: {
            template: true,
            merchant: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return orders;
      }),

    // 申请退款
    requestRefund: protectedProcedure
      .input(RefundOrderSchema)
      .mutation(async ({ input, ctx }) => {
        const { orderId, reason } = input;
        const userId = ctx.user.id;

        const order = await ctx.prisma.order.findUnique({
          where: { id: orderId },
          include: { template: true },
        });

        if (!order) {
          throw new BadRequestException('订单不存在');
        }

        // 验证所有权
        if (order.userId !== userId) {
          throw new ForbiddenException('无权操作此订单');
        }

        // 验证订单状态
        if (order.status !== 'PAID') {
          throw new BadRequestException('只有已支付的订单可以退款');
        }

        // 更新订单状态
        const updated = await ctx.prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'REFUNDING',
            refundReason: reason,
          },
        });

        return updated;
      }),
  }),
  {
    protectedCreate: true,
    protectedUpdate: true,
    protectedDelete: true,
    protectedDeleteMany: true,
  },
);