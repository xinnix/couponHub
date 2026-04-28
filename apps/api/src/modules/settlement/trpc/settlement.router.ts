import {
  GenerateSettlementSchema,
  SettlementListQuerySchema,
  MarkPaidSchema,
  ConfirmSettlementSchema,
} from '@opencode/shared';
import { createCrudRouterWithCustom } from '../../../trpc/trpc.helper';
import { protectedProcedure, permissionProcedure } from '../../../trpc/trpc';
import { TRPCError } from '@trpc/server';
import ExcelJS from 'exceljs';
import { z } from 'zod';

/**
 * Settlement tRPC Router
 *
 * 结算单管理路由，提供标准 CRUD 操作和自定义方法。
 * 所有管理端操作需要对应权限。
 */
export const settlementRouter = createCrudRouterWithCustom(
  'Settlement',
  {
    getMany: SettlementListQuerySchema,
  },
  (t) => ({
    // 重写 getMany 以包含 merchant 关系 - 需要权限
    getMany: permissionProcedure('settlement', 'read')
      .input(SettlementListQuerySchema)
      .query(async ({ ctx, input }) => {
        const { page = 1, pageSize = 10, merchantId, status, period } = input;

        // 构建 where 条件
        const where: any = {};
        if (merchantId) where.merchantId = merchantId;
        if (status) where.status = status;
        if (period) where.period = { contains: period };

        const [items, total] = await Promise.all([
          ctx.prisma.settlement.findMany({
            skip: (page - 1) * pageSize,
            take: pageSize,
            where,
            orderBy: { createdAt: 'desc' },
            include: {
              merchant: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  category: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          }),
          ctx.prisma.settlement.count({ where }),
        ]);

        return {
          items,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        };
      }),

    // 重写 getOne 以包含 merchant 关系 - 需要权限
    getOne: permissionProcedure('settlement', 'read')
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        return ctx.prisma.settlement.findUnique({
          where: { id: input.id },
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
                phone: true,
                category: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        });
      }),

    // 生成结算单 - 需要权限（本质上是创建操作）
    createSettlement: permissionProcedure('settlement', 'read')
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
            throw new TRPCError({
              code: 'CONFLICT',
              message: '该商户该月份的结算单已存在',
            });
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
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: '没有可结算的订单',
            });
          }

          // 生成快照数据
          const ordersSnapshot = orders.map((order) => ({
            orderId: order.id,
            orderNo: order.orderNo,
            price: Number(order.price),
            faceValue: Number(order.faceValue),
            settlementAmount: order.template.settlementAmount
              ? Number(order.template.settlementAmount)
              : Number(order.faceValue), // fallback 到面值
            templateTitle: order.template.title,
            redeemedAt: order.redeemedAt,
            userNickname: order.user.nickname,
          }));

          // 包装成完整的快照对象
          const snapshotData = {
            orders: ordersSnapshot,
            generatedAt: new Date(),
            generatedBy: ctx.user.email || 'system',
          };

          // 计算结算金额（使用 settlementAmount，为空时 fallback 到 faceValue）
          const totalAmount = orders.reduce(
            (sum, order) => {
              const amount = order.template.settlementAmount
                ? Number(order.template.settlementAmount)
                : Number(order.faceValue);
              return sum + amount;
            },
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

    // 确认结算单 - 需要权限
    confirm: permissionProcedure('settlement', 'confirm')
      .input(ConfirmSettlementSchema)
      .mutation(async ({ input, ctx }) => {
        const { settlementId } = input;

        const settlement = await ctx.prisma.settlement.findUnique({
          where: { id: settlementId },
        });

        if (!settlement) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '结算单不存在',
          });
        }

        if (settlement.status !== 'PENDING') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '结算单状态不允许确认',
          });
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

    // 结算统计 - 需要权限（支持筛选条件）
    getStats: permissionProcedure('settlement', 'read')
      .input(z.object({
        status: z.string().optional(),
        merchantId: z.string().optional(),
        period: z.string().optional(),
      }).optional().default({}))
      .query(async ({ ctx, input }) => {
        const where: any = {};
        if (input.status) where.status = input.status;
        if (input.merchantId) where.merchantId = input.merchantId;
        if (input.period) where.period = { contains: input.period };

        const [statusGroup, paidStats, totalCount] = await Promise.all([
          ctx.prisma.settlement.groupBy({
            by: ['status'],
            where,
            _count: true,
            _sum: { totalAmount: true },
          }),
          ctx.prisma.settlement.aggregate({
            where: { ...where, status: 'PAID' },
            _sum: { totalAmount: true },
          }),
          ctx.prisma.settlement.count({ where }),
        ]);

        return {
          statusDistribution: statusGroup.map((g) => ({
            status: g.status,
            count: g._count,
            amount: Number(g._sum.totalAmount ?? 0),
          })),
          totalPaidAmount: Number(paidStats._sum.totalAmount ?? 0),
          totalCount,
        };
      }),

    // 标记已支付 - 需要权限
    markPaid: permissionProcedure('settlement', 'mark_paid')
      .input(MarkPaidSchema)
      .mutation(async ({ input, ctx }) => {
        const { settlementId, paymentNote } = input;

        const settlement = await ctx.prisma.settlement.findUnique({
          where: { id: settlementId },
        });

        if (!settlement) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '结算单不存在',
          });
        }

        if (settlement.status !== 'CONFIRMED') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: '结算单状态不允许标记已支付',
          });
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

    // 导出结算单为 Excel - 需要权限
    exportExcel: permissionProcedure('settlement', 'read')
      .input(ConfirmSettlementSchema)
      .mutation(async ({ input, ctx }) => {
        const { settlementId } = input;

        const settlement = await ctx.prisma.settlement.findUnique({
          where: { id: settlementId },
          include: { merchant: true },
        });

        if (!settlement) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '结算单不存在',
          });
        }

        // 创建 Excel 工作簿
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'OpenCode';
        workbook.created = new Date();

        // 添加结算单信息工作表
        const infoSheet = workbook.addWorksheet('结算单信息');
        infoSheet.columns = [
          { header: '项目', key: 'item', width: 20 },
          { header: '内容', key: 'content', width: 40 },
        ];

        // 添加结算单基本信息
        const statusText = {
          PENDING: '待确认',
          CONFIRMED: '已确认',
          PAID: '已支付',
        };

        infoSheet.addRows([
          { item: '结算期间', content: settlement.period },
          { item: '商户名称', content: settlement.merchant?.name || '-' },
          { item: '商户分类', content: settlement.merchant?.category?.name || '-' },
          { item: '商户电话', content: settlement.merchant?.phone || '-' },
          { item: '订单数量', content: `${settlement.orderCount} 笔` },
          { item: '结算金额', content: `${Number(settlement.totalAmount).toFixed(2)} 元` },
          { item: '状态', content: statusText[settlement.status] },
          { item: '创建时间', content: new Date(settlement.createdAt).toLocaleString('zh-CN') },
        ]);

        // 设置表头样式
        infoSheet.getRow(1).font = { bold: true, size: 12 };
        infoSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };

        // 添加订单明细工作表
        const ordersSheet = workbook.addWorksheet('订单明细');
        ordersSheet.columns = [
          { header: '序号', key: 'index', width: 8 },
          { header: '订单号', key: 'orderNo', width: 20 },
          { header: '优惠券', key: 'templateTitle', width: 25 },
          { header: '用户', key: 'userNickname', width: 15 },
          { header: '购买价格(元)', key: 'price', width: 15 },
          { header: '面值(元)', key: 'faceValue', width: 15 },
          { header: '结算金额(元)', key: 'settlementAmount', width: 15 },
          { header: '核销时间', key: 'redeemedAt', width: 20 },
        ];

        // 设置订单明细表头样式
        ordersSheet.getRow(1).font = { bold: true, size: 11 };
        ordersSheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' },
        };
        ordersSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        // 添加订单数据
        const snapshotData = settlement.snapshotData as any;
        if (snapshotData && snapshotData.orders) {
          snapshotData.orders.forEach((order: any, index: number) => {
            ordersSheet.addRow({
              index: index + 1,
              orderNo: order.orderNo,
              templateTitle: order.templateTitle,
              userNickname: order.userNickname,
              price: Number(order.price).toFixed(2),
              faceValue: Number(order.faceValue).toFixed(2),
              settlementAmount: Number(order.settlementAmount).toFixed(2),
              redeemedAt: new Date(order.redeemedAt).toLocaleString('zh-CN'),
            });
          });
        }

        // 添加汇总行
        const totalRow = ordersSheet.addRow({
          index: '合计',
          orderNo: `${settlement.orderCount} 笔`,
          templateTitle: '',
          userNickname: '',
          price: snapshotData?.orders?.reduce((sum: number, o: any) => sum + Number(o.price), 0).toFixed(2),
          faceValue: snapshotData?.orders?.reduce((sum: number, o: any) => sum + Number(o.faceValue), 0).toFixed(2),
          settlementAmount: Number(settlement.totalAmount).toFixed(2),
          redeemedAt: '',
        });
        totalRow.font = { bold: true };
        totalRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF2CC' },
        };

        // 添加签字区域工作表
        const signSheet = workbook.addWorksheet('签字确认');
        signSheet.columns = [
          { header: '确认事项', key: 'item', width: 50 },
          { header: '签字', key: 'sign', width: 30 },
        ];

        signSheet.addRows([
          { item: '商户确认以上订单明细无误', sign: '' },
          { item: '商户签字：', sign: '' },
          { item: '', sign: '' },
          { item: '签字日期：', sign: '' },
          { item: '', sign: '' },
          { item: '平台审核人签字：', sign: '' },
          { item: '', sign: '' },
          { item: '审核日期：', sign: '' },
        ]);

        signSheet.getRow(1).font = { bold: true, size: 12 };

        // 生成 Excel 文件的 Buffer
        const buffer = await workbook.xlsx.writeBuffer();

        // 转换为 Uint8Array 然后转为 base64
        const uint8Array = new Uint8Array(buffer as ArrayBuffer);
        const base64 = btoa(String.fromCharCode(...uint8Array));

        // 返回 base64 编码的文件内容
        return {
          fileName: `结算单_${settlement.period}_${settlement.merchant?.name || '未知商户'}.xlsx`,
          fileContent: base64,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
      }),

    // 删除结算单 - 需要权限（同时解锁关联订单）
    delete: permissionProcedure('settlement', 'delete')
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const settlement = await ctx.prisma.settlement.findUnique({
          where: { id: input.id },
        });
        if (!settlement) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '结算单不存在' });
        }

        const snapshot = settlement.snapshotData as any;
        const orderIds: string[] = snapshot?.orders?.map((o: any) => o.orderId) || [];

        await ctx.prisma.$transaction(async (tx) => {
          if (orderIds.length > 0) {
            await tx.order.updateMany({
              where: { id: { in: orderIds } },
              data: { isLocked: false },
            });
          }
          await tx.settlement.delete({ where: { id: input.id } });
        });

        return { success: true };
      }),

    // 批量删除结算单 - 需要权限（同时解锁关联订单）
    deleteMany: permissionProcedure('settlement', 'delete')
      .input(z.object({ ids: z.array(z.string()) }))
      .mutation(async ({ ctx, input }) => {
        const settlements = await ctx.prisma.settlement.findMany({
          where: { id: { in: input.ids } },
        });

        const allOrderIds = settlements.flatMap((s) => {
          const snapshot = s.snapshotData as any;
          return snapshot?.orders?.map((o: any) => o.orderId) || [];
        });

        await ctx.prisma.$transaction(async (tx) => {
          if (allOrderIds.length > 0) {
            await tx.order.updateMany({
              where: { id: { in: allOrderIds } },
              data: { isLocked: false },
            });
          }
          await tx.settlement.deleteMany({
            where: { id: { in: input.ids } },
          });
        });

        return { success: true, count: input.ids.length };
      }),
  }),
  {
    protectedCreate: true,
    protectedUpdate: true,
    protectedDelete: true,
    protectedDeleteMany: true,
  },
);