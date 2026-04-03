import { Injectable, Logger, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseService } from '../../../common/base.service';
import { RedisService } from '../../../shared/services/redis.service';
import { WechatPayService } from '../../payment/services/wechat-pay.service';

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

      // 3. 检查有效期
      const now = new Date();
      if (template.validFrom > now || template.validUntil < now) {
        throw new BadRequestException('该券不在有效期内');
      }

      // 4. 检查库存
      if (template.stock <= 0) {
        throw new ConflictException('库存不足');
      }

      // 5. 生成订单号
      const orderNo = this.generateOrderNo();

      // 6. 创建订单
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

      // 7. 预扣库存
      await this.prisma.couponTemplate.update({
        where: { id: templateId },
        data: { stock: { decrement: 1 } },
      });

      this.logger.log(`订单创建成功: ${orderNo}, 用户: ${userId}`);

      // 8. 返回订单信息
      return { order };
    } finally {
      // 9. 释放锁
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

    // 验证是否已核销
    if (order.redeemedAt) {
      throw new BadRequestException('已核销的订单无法退款');
    }

    // 验证有效期
    if (order.template.validUntil < new Date()) {
      throw new BadRequestException('订单已过期，请申请过期退款');
    }

    // 更新订单状态为退款中
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REFUNDING',
        refundReason: reason,
      },
    });

    try {
      // 调用微信退款接口
      const refundTransactionId = await this.wechatPayService.refund({
        orderNo: order.orderNo,
        refundNo: `refund_${Date.now()}`,
        totalAmount: Number(order.price),
        refundAmount: Number(order.price),
        reason,
      });

      // 退款成功，自动更新订单状态为 REFUNDED
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'REFUNDED',
          refundId: refundTransactionId,
          refundedAt: new Date(),
        },
      });

      this.logger.log(`订单退款成功: ${order.orderNo}, 退款单号: ${refundTransactionId}`);
      return { refundId: refundTransactionId };
    } catch (error) {
      // 退款失败，恢复订单状态为 PAID
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          refundReason: null,
        },
      });

      this.logger.error(`订单退款失败: ${order.orderNo}`, error);
      throw error;
    }
  }

  /**
   * 退款成功确认
   */
  async confirmRefund(orderId: string, refundId: string) {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REFUNDED',
        refundId,
        refundedAt: new Date(),
      },
    });

    this.logger.log(`订单退款成功: ${order.orderNo}`);
    return order;
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