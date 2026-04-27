import {
  CreateOrderSchema,
  OrderListQuerySchema,
  RefundOrderSchema,
} from '@opencode/shared';
import { createCrudRouterWithCustom } from '../../../trpc/trpc.helper';
import { protectedProcedure, permissionProcedure } from '../../../trpc/trpc';
import { z } from 'zod';
import { ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { verifyRedeemCode } from '../../../shared/utils/qrcode.util';

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
    // 管理端查询订单列表 - 需要权限
    getMany: permissionProcedure('order', 'read')
      .input(OrderListQuerySchema)
      .query(async ({ ctx, input }) => {
        const parsedInput = OrderListQuerySchema.safeParse(input);
        if (!parsedInput.success) {
          throw parsedInput.error;
        }
        const data = parsedInput.data as any;

        const model = ctx.prisma.order;
        const [items, total] = await Promise.all([
          model.findMany({
            skip: data.skip ?? (data.page ? (data.page - 1) * (data.limit || 10) : 0),
            take: data.take ?? data.limit,
            where: data.where,
            orderBy: data.orderBy ?? { createdAt: 'desc' },
            include: data.include || {
              user: { select: { id: true, nickname: true, email: true } },
              template: true,
              merchant: true,
            },
            select: data.select,
          }),
          model.count({ where: data.where }),
        ]);

        return {
          items,
          total,
          page: data.page || 1,
          pageSize: data.limit || 10,
          totalPages: Math.ceil(total / (data.limit || 10)),
        };
      }),

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

        // 2. 检查销售期
        const now = new Date();
        if (template.saleFrom > now || template.saleUntil < now) {
          throw new BadRequestException('该券不在销售期内');
        }

        // 3. 检查库存
        if (template.stock <= 0) {
          throw new ConflictException('库存不足');
        }

        // === 新增逻辑：领取上限检查 ===
        // 4. 检查用户领取上限
        if (template.claimLimit !== null && template.claimLimit > 0) {
          // 查询用户已领取的该券数量（PAID 和 REDEEMED 状态）
          const userClaimCount = await ctx.prisma.order.count({
            where: {
              userId,
              templateId,
              status: { in: ['PAID', 'REDEEMED'] }, // 只统计有效订单
            },
          });

          if (userClaimCount >= template.claimLimit) {
            throw new ConflictException(
              `每人限领${template.claimLimit}张，您已领取${userClaimCount}张`
            );
          }
        }

        // === 新增逻辑：免费券判断 ===
        // 5. 判断是否为免费券
        const isFree = Number(template.buyPrice) === 0;
        const initialStatus = isFree ? 'PAID' : 'UNPAID';

        // 计算过期时间（免费券立即计算，付费券在支付成功后计算）
        // expireAt = 有 validDays ? min(useUntil, paidAt + validDays) : useUntil
        let expireAt: Date | undefined;

        if (isFree) {
          const now = new Date();

          if (template.validDays && template.validDays > 0) {
            // 相对有效期：领取后X天有效
            const relativeExpireAt = new Date(now.getTime() + template.validDays * 24 * 60 * 60 * 1000);

            // 取两者的最小值（确保不超过使用期截止时间）
            expireAt = relativeExpireAt < template.useUntil ? relativeExpireAt : template.useUntil;
          } else {
            // 无相对有效期，直接使用使用期截止时间
            expireAt = template.useUntil;
          }
        }

        // 6. 生成订单号
        const orderNo = generateOrderNo();

        // 7. 创建订单并扣减库存（事务）
        const order = await ctx.prisma.$transaction(async (tx) => {
          // 创建订单
          const newOrder = await tx.order.create({
            data: {
              orderNo,
              userId,
              templateId,
              status: initialStatus, // 根据是否免费决定初始状态
              price: template.buyPrice,
              faceValue: template.faceValue,
              isFreeOrder: isFree, // 新增字段标记
              paidAt: isFree ? now : undefined, // 免费券直接记录领取时间
              expireAt: expireAt, // 免费券立即设置过期时间
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

        // === 新增返回值：needPayment 标识 ===
        return {
          order,
          needPayment: !isFree, // 前端根据此字段判断是否需要支付
        };
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

        // 验证是否已核销（已核销的订单不能退款）
        if (order.redeemedAt) {
          throw new BadRequestException('已核销的订单无法退款');
        }

        // 立即调用微信支付退款API（用户申请后直接退款，无需管理员审核）
        const refundNo = `RF${Date.now()}`;
        let refundId: string | undefined;

        try {
          const { WechatPayService } = await import('../../payment/services/wechat-pay.service');
          const wechatPayService = ctx.app.get(WechatPayService);

          refundId = await wechatPayService.refund({
            orderNo: order.orderNo,
            refundNo,
            totalAmount: Number(order.price),
            refundAmount: Number(order.price),
            reason: reason || '用户申请退款',
          });

          // 更新订单状态为 REFUNDING（等待微信回调确认）
          const updated = await ctx.prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'REFUNDING',
              refundReason: reason,
              refundId,
            },
          });

          return updated;
        } catch (error: any) {
          // 微信退款失败，恢复订单状态
          throw new BadRequestException(`微信退款失败: ${error.message || error}`);
        }
      }),

    // 根据核销码获取订单信息（用于核销前确认）
    getByCode: protectedProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input, ctx }) => {
        const { code } = input;

        // 1. 解析核销码
        const { orderId, valid, reason } = verifyRedeemCode(code);

        if (!valid) {
          throw new BadRequestException(reason || '二维码无效');
        }

        // 2. 查询订单信息
        const order = await ctx.prisma.order.findUnique({
          where: { id: orderId },
          include: {
            template: true,
            merchant: true,
            user: {
              select: {
                id: true,
                nickname: true,
                phone: true,
              },
            },
          },
        });

        if (!order) {
          throw new BadRequestException('订单不存在');
        }

        // 3. 验证订单状态（必须是已支付）
        if (order.status !== 'PAID') {
          throw new BadRequestException(`订单状态异常: ${order.status}`);
        }

        // 4. 返回订单信息（包含更多关键信息）
        return {
          orderId: order.id,
          code: code,
          orderNo: order.orderNo,
          faceValue: Number(order.faceValue),
          price: Number(order.price), // 用户实际支付金额
          title: order.template?.title || '优惠券',
          merchantName: order.merchant?.name || '商户',
          couponType: '全场通用', // 可以从 template 中获取
          expireDate: order.expireAt
            ? new Date(order.expireAt).toLocaleDateString('zh-CN')
            : '长期有效',
          status: order.status,
          // 新增字段（添加空值保护）
          userNickname: order.user?.nickname || '未知用户',
          userPhone: order.user?.phone || '未绑定手机',
          paidAt: order.paidAt
            ? new Date(order.paidAt).toLocaleDateString('zh-CN')
            : new Date(order.createdAt).toLocaleDateString('zh-CN'),
          isFree: order.isFreeOrder, // 是否免费券
        };
      }),
  }),
  {
    protectedCreate: true,
    protectedUpdate: true,
    protectedDelete: true,
    protectedDeleteMany: true,
  },
);