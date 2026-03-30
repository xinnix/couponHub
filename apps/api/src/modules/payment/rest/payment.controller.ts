import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
  Logger,
  RawBodyRequest,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { z } from 'zod';
import { JwtAuthGuard } from '../../../core/guards/jwt.guard';
import { CurrentUser } from '../../auth/decorators/decorators';
import { PrismaService } from '../../../prisma/prisma.service';
import { WechatPayService } from '../services/wechat-pay.service';

const CreatePaymentSchema = z.object({
  orderId: z.string().min(1, '订单ID不能为空'),
});

@ApiTags('payments')
@Controller('payments')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wechatPayService: WechatPayService,
  ) {}

  /**
   * 创建支付（小程序 JSAPI 支付）
   *
   * 流程：
   * 1. 查找订单和用户 openid
   * 2. 调用微信 JSAPI 下单获取 prepay_id
   * 3. 签名生成小程序支付参数返回
   */
  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建微信支付订单' })
  @ApiResponse({ status: 200, description: '创建成功，返回支付参数' })
  async create(
    @Body() body: any,
    @CurrentUser() user: any,
  ) {
    const { orderId } = CreatePaymentSchema.parse(body);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { template: true },
    });

    if (!order) {
      throw new BadRequestException('订单不存在');
    }

    if (user?.type === 'user' && order.userId !== user.id) {
      throw new ForbiddenException('无权操作该订单');
    }

    if (order.status !== 'UNPAID') {
      throw new BadRequestException('订单状态异常');
    }

    // 获取用户 openid
    const userInfo = await this.prisma.user.findUnique({
      where: { id: order.userId },
      select: { openid: true },
    });

    if (!userInfo?.openid) {
      throw new BadRequestException('用户未绑定微信，无法支付');
    }

    // 调用微信支付下单
    const prepayId = await this.wechatPayService.createOrder({
      orderId: order.id,
      orderNo: order.orderNo,
      amount: Number(order.price),
      description: order.template.title,
      openid: userInfo.openid,
    });

    // 生成小程序支付参数
    const payParams = this.wechatPayService.getPayParams(prepayId);

    return {
      success: true,
      prepayId,
      payParams,
    };
  }

  /**
   * 微信支付回调通知
   *
   * 微信服务器在用户支付成功后主动调用此接口。
   * 无需 JWT 认证，通过签名验证确保请求来自微信。
   */
  @Post('wechat/callback')
  @ApiOperation({ summary: '微信支付回调通知（微信服务器调用）' })
  async wechatCallback(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
  ) {
    const rawBody = (req as any).rawBody;

    if (!rawBody) {
      this.logger.error('回调缺少 rawBody');
      throw new BadRequestException('Invalid request');
    }

    try {
      // 解密回调数据
      const payment = await this.wechatPayService.handleCallback(
        rawBody,
        {
          'wechatpay-timestamp': headers['wechatpay-timestamp'],
          'wechatpay-nonce': headers['wechatpay-nonce'],
          'wechatpay-signature': headers['wechatpay-signature'],
          'wechatpay-serial': headers['wechatpay-serial'],
        },
      );

      // 更新订单状态
      const order = await this.prisma.order.findUnique({
        where: { id: payment.orderId },
      });

      if (!order) {
        this.logger.error(`回调对应的订单不存在: ${payment.orderId}`);
        throw new BadRequestException('Order not found');
      }

      if (order.status !== 'UNPAID') {
        this.logger.warn(
          `订单状态已变更，跳过更新: ${payment.orderNo}, 当前状态: ${order.status}`,
        );
        // 返回成功避免微信重试
        return { code: 'SUCCESS', message: 'OK' };
      }

      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'PAID',
          payId: payment.transactionId,
          paidAt: payment.paidAt,
        },
      });

      this.logger.log(
        `支付回调处理成功: ${payment.orderNo} → ${payment.transactionId}`,
      );

      // 微信要求返回此格式
      return { code: 'SUCCESS', message: 'OK' };
    } catch (error: any) {
      this.logger.error('支付回调处理失败', error);
      // 返回失败让微信重试
      return { code: 'FAIL', message: error.message || 'Internal error' };
    }
  }

  /**
   * 查询支付状态
   */
  @Get('status/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询订单支付状态' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getStatus(@Param('orderId') orderId: string, @CurrentUser() user: any) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('订单不存在');
    }

    if (user?.type === 'user' && order.userId !== user.id) {
      throw new ForbiddenException('无权操作该订单');
    }

    // 如果已经支付，直接返回
    if (order.status === 'PAID') {
      return { status: 'SUCCESS', order };
    }

    // 主动查询微信
    try {
      const result = await this.wechatPayService.queryOrder(order.orderNo);
      return { status: result.status, transactionId: result.transactionId };
    } catch {
      return { status: order.status };
    }
  }
}
