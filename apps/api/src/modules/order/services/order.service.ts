import { Injectable, Logger, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseService } from '../../../common/base.service';
import { RedisService } from '../../../shared/services/redis.service';
import { WechatPayService } from '../../payment/services/wechat-pay.service';
import { StockLogService, StockChangeReason } from '../../coupon/services/stock-log.service';

/**
 * 订单服务
 *
 * 核心功能：
 * - 创建订单（预扣库存）
 * - 支付确认
 * - 退款处理
 */
@Injectable()
export class OrderService extends BaseService<'Order'> {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly wechatPayService: WechatPayService,
    private readonly stockLogService: StockLogService,
  ) {
    super(prisma, 'Order');
  }

  /**
   * 创建订单
   *
   * 流程：
   * 1. 获取 Redis 分布式锁
   * 2. 检查库存
   * 3. 创建订单（状态：UNPAID）
   * 4. 预扣库存
   * 5. 发起支付
   * 6. 释放锁
   */
  async createOrder(userId: string, templateId: string) {
    // 1. 获取分布式锁
    const lockKey = `coupon:stock:${templateId}`;
    const lock = await this.redisService.acquireLock(lockKey, 5000);

    if (!lock) {
      throw new ConflictException('系统繁忙，请稍后重试');
    }

    try {
      // 2. 查询券模板
      const template = await this.prisma.couponTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new BadRequestException('券模板不存在');
      }

      // 3. 检查销售期（是否在售卖时间范围内）
      const now = new Date();
      if (template.saleFrom > now) {
        throw new BadRequestException('该券尚未开始销售');
      }
      if (template.saleUntil < now) {
        throw new BadRequestException('该券已结束销售');
      }

      // 4. 检查库存
      if (template.stock <= 0) {
        throw new ConflictException('库存不足');
      }

      // ✅ 5. 检查每人限领数量
      if (template.claimLimit !== null) {
        // 查询用户已领取的订单数量（PAID + REDEEMED 状态）
        // 注意：核销后订单仍计入限领数量，防止重复领取
        const userClaimedCount = await this.prisma.order.count({
          where: {
            userId,
            templateId,
            status: {
              in: ['PAID', 'REDEEMED'], // 统计已支付和已核销的订单
            },
          },
        });

        if (userClaimedCount >= template.claimLimit) {
          throw new BadRequestException(
            `每人限领 ${template.claimLimit} 张，您已领取 ${userClaimedCount} 张`,
          );
        }
      }

      // 6. 生成订单号
      const orderNo = this.generateOrderNo();

      // 7. 创建订单
      const order = await this.prisma.order.create({
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

      // 8. 预扣库存，如果库存为0则自动标记为售罄
      const updatedTemplate = await this.prisma.couponTemplate.update({
        where: { id: templateId },
        data: {
          stock: { decrement: 1 },
          // 如果扣减后库存为0，自动标记为 DISABLED
          ...(template.stock === 1 && { status: 'DISABLED' }),
        },
      });

      if (updatedTemplate.stock === 0) {
        this.logger.log(`券模板已售罄: ${template.title} (ID: ${templateId})`);
      }

      // ✅ 9. 记录库存变更日志
      await this.stockLogService.log(
        templateId,
        -1, // 扣减库存
        updatedTemplate.stock,
        StockChangeReason.ORDER_CREATE,
        order.id,
        undefined,
        { orderNo, userId },
      );

      this.logger.log(`订单创建成功: ${orderNo}, 用户: ${userId}`);

      // ✅ 9. 免费券自动支付
      const buyPrice = Number(template.buyPrice);
      if (buyPrice === 0) {
        // 计算过期时间：expireAt = 有 validDays ? min(useUntil, paidAt + validDays) : useUntil
        const paidAt = new Date();
        let expireAt: Date;

        if (template.validDays && template.validDays > 0) {
          const relativeExpireAt = new Date(paidAt.getTime() + template.validDays * 24 * 60 * 60 * 1000);
          expireAt = relativeExpireAt < template.useUntil ? relativeExpireAt : template.useUntil;
        } else {
          expireAt = template.useUntil;
        }

        const paidOrder = await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'PAID',
            paidAt,
            isFreeOrder: true,
            expireAt,
          },
          include: {
            template: true,
          },
        });

        this.logger.log(`免费券自动支付成功: ${orderNo}`);

        // 返回已支付订单信息，标记无需支付
        return {
          order: paidOrder,
          needPayment: false,
        };
      }

      // 10. 返回订单信息（需要支付）
      return {
        order,
        needPayment: true,
      };
    } finally {
      // 11. 释放锁
      await this.redisService.releaseLock(lockKey, lock);
    }
  }

  /**
   * 支付成功确认
   *
   * 流程：
   * 1. 验证订单状态
   * 2. 更新订单状态为 PAID
   * 3. 记录支付信息
   */
  async confirmPayment(orderId: string, paymentData: {
    payId: string;
    paidAt: Date;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('订单不存在');
    }

    if (order.status !== 'UNPAID') {
      throw new BadRequestException('订单状态异常');
    }

    // 更新订单状态
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        payId: paymentData.payId,
        paidAt: paymentData.paidAt,
      },
    });

    this.logger.log(`订单支付成功: ${order.orderNo}`);
    return updated;
  }

  /**
   * 申请退款
   *
   * 流程：
   * 1. 验证订单状态
   * 2. 检查退款条件
   * 3. 更新订单状态为 REFUNDING
   * 4. 调用退款接口
   */
  async requestRefund(orderId: string, userId: string, reason: string) {
    const order = await this.prisma.order.findUnique({
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

    // 验证是否已核销（核销是退款的关键判断条件）
    if (order.redeemedAt) {
      throw new BadRequestException('已核销的订单无法退款');
    }

    // 注意：过期不应该阻止退款
    // 只要订单未被核销使用，用户就有权申请退款返还资金

    // 更新订单状态为退款中
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REFUNDING',
        refundReason: reason,
      },
    });

    // 调用微信退款接口（异步处理，等待回调确认）
    const refundTransactionId = await this.wechatPayService.refund({
      orderNo: order.orderNo,
      refundNo: `refund_${Date.now()}`,
      totalAmount: Number(order.price),
      refundAmount: Number(order.price),
      reason,
    });

    this.logger.log(`订单退款申请已提交: ${order.orderNo}, 退款单号: ${refundTransactionId}, 等待微信回调确认`);
    return { refundId: refundTransactionId };
  }

  /**
   * 退款成功确认
   *
   * 流程：
   * 1. 更新订单状态为 REFUNDED
   * 2. 恢复库存
   * 3. 如果之前状态为 DISABLED 且库存恢复后 > 0，则恢复为 ACTIVE
   */
  async confirmRefund(orderId: string, refundId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { template: true },
    });

    if (!order) {
      throw new BadRequestException('订单不存在');
    }

    // 使用数据库事务保证订单状态更新和库存恢复的一致性
    const { updatedOrder, updatedTemplate } = await this.prisma.$transaction(async (tx) => {
      // 1. 更新订单状态
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'REFUNDED',
          refundId,
          refundedAt: new Date(),
        },
      });

      // 2. 查询当前券模板状态（判断是否需要重新上架）
      const currentTemplate = await tx.couponTemplate.findUnique({
        where: { id: order.templateId },
      });

      if (!currentTemplate) {
        throw new BadRequestException('券模板不存在');
      }

      const shouldReactivate = currentTemplate.stock === 0 && currentTemplate.status === 'DISABLED';

      // 3. 恢复库存并更新券模板状态
      const updatedTemplate = await tx.couponTemplate.update({
        where: { id: order.templateId },
        data: {
          stock: { increment: 1 },
          ...(shouldReactivate && { status: 'ACTIVE' }),
        },
      });

      return { updatedOrder, updatedTemplate };
    });

    // 4. 记录库存变更日志（事务外，不影响核心业务）
    const refundReason = order.status === 'EXPIRED'
      ? StockChangeReason.EXPIRED_REFUND
      : StockChangeReason.REFUND;

    await this.stockLogService.log(
      order.templateId,
      1,
      updatedTemplate.stock,
      refundReason,
      order.id,
      undefined,
      { orderNo: order.orderNo, refundId, originalStatus: order.status },
    );

    this.logger.log(
      `订单退款成功: ${order.orderNo}, 库存已恢复 (当前库存: ${updatedTemplate.stock})`,
    );

    if (updatedTemplate.stock > 0 && order.template.status === 'DISABLED') {
      this.logger.log(
        `券模板已重新上架: ${order.template.title} (ID: ${order.templateId})`,
      );
    }

    return updatedOrder;
  }

  /**
   * 查询用户的订单列表（券包）
   */
  async getMyOrders(userId: string, status?: string) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const orders = await this.prisma.order.findMany({
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
  }

  /**
   * 生成订单号
   * 格式：年月日时分秒 + 6位随机数
   */
  private generateOrderNo(): string {
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
}