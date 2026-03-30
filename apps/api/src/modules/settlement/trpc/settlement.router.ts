import {
  GenerateSettlementSchema,
  SettlementListQuerySchema,
  MarkPaidSchema,
  ConfirmSettlementSchema,
} from '@opencode/shared';
import { createCrudRouterWithCustom } from '../../../trpc/trpc.helper';
import { protectedProcedure } from '../../../trpc/trpc';
import { ConflictException, BadRequestException } from '@nestjs/common';

/**
 * Settlement tRPC Router
 *
 * 结算单管理路由，提供标准 CRUD 操作和自定义方法。
 * 所有操作需要管理员权限。
 */
export const settlementRouter = createCrudRouterWithCustom(
  'Settlement',
  {
    getMany: SettlementListQuerySchema,
  },
  (t) => ({
    // 生成结算单
    createSettlement: protectedProcedure
      .input(GenerateSettlementSchema)
      .mutation(async ({ input, ctx }) => {
        const { merchantId, period } = input;

        // 解析月份范围
        const [year, month] = period.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        // 使用事务确保数据一致性
        const settlement = await ctx.prisma.$transaction(async (tx) => {
          // 检查是否已存在
          const existing = await tx.settlement.findUnique({
            where: { merchantId_period: { merchantId, period } },
          });

          if (existing) {
            throw new ConflictException('该商户该月份的结算单已存在');
          }

          // 查询待结算订单
          const orders = await tx.order.findMany({
            where: {
              redeemMerchantId: merchantId,
              status: 'REDEEMED',
              isLocked: false,
              redeemedAt: {
                gte: startDate,
                lte: endDate,
              },
            },
            include: {
              template: true,
              user: {
                select: {
                  id: true,
                  nickname: true,
                },
              },
            },
          });

          if (orders.length === 0) {
            throw new BadRequestException('没有可结算的订单');
          }

          // 生成快照数据
          const snapshotData = orders.map((order) => ({
            orderId: order.id,
            orderNo: order.orderNo,
            price: Number(order.price),
            faceValue: Number(order.faceValue),
            templateTitle: order.template.title,
            redeemedAt: order.redeemedAt,
            userNickname: order.user.nickname,
          }));

          // 计算结算金额（使用 reduce 累加，然后转为 Decimal）
          const totalAmount = orders.reduce(
            (sum, order) => sum + Number(order.faceValue),
            0,
          );

          // 锁定订单
          await tx.order.updateMany({
            where: { id: { in: orders.map((o) => o.id) } },
            data: { isLocked: true },
          });

          // 创建结算单
          const newSettlement = await tx.settlement.create({
            data: {
              merchantId,
              period,
              totalAmount,
              orderCount: orders.length,
              snapshotData,
              status: 'PENDING',
            },
            include: { merchant: true },
          });

          return newSettlement;
        });

        return settlement;
      }),

    // 确认结算单
    confirm: protectedProcedure
      .input(ConfirmSettlementSchema)
      .mutation(async ({ input, ctx }) => {
        const { settlementId } = input;

        const settlement = await ctx.prisma.settlement.findUnique({
          where: { id: settlementId },
        });

        if (!settlement) {
          throw new BadRequestException('结算单不存在');
        }

        if (settlement.status !== 'PENDING') {
          throw new BadRequestException('结算单状态不允许确认');
        }

        const updated = await ctx.prisma.settlement.update({
          where: { id: settlementId },
          data: {
            status: 'CONFIRMED',
            confirmedAt: new Date(),
            confirmedBy: ctx.user.id,
          },
          include: { merchant: true },
        });

        return updated;
      }),

    // 标记已支付
    markPaid: protectedProcedure
      .input(MarkPaidSchema)
      .mutation(async ({ input, ctx }) => {
        const { settlementId, paymentNote } = input;

        const settlement = await ctx.prisma.settlement.findUnique({
          where: { id: settlementId },
        });

        if (!settlement) {
          throw new BadRequestException('结算单不存在');
        }

        if (settlement.status !== 'CONFIRMED') {
          throw new BadRequestException('结算单状态不允许标记已支付');
        }

        const updated = await ctx.prisma.settlement.update({
          where: { id: settlementId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
          include: { merchant: true },
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