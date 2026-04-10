import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateOrderSchema, RefundOrderSchema } from '@opencode/shared';
import { JwtAuthGuard } from '../../../core/guards/jwt.guard';
import { CurrentUser } from '../../auth/decorators/decorators';
import { OrderService } from '../services/order.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { verifyRedeemCode, generateRedeemCode } from '../../../shared/utils/qrcode.util';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({ summary: '创建订单' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async createOrder(@Body() body: any, @CurrentUser() user: any) {
    const data = CreateOrderSchema.parse(body);
    return this.orderService.createOrder(user.id, data.templateId);
  }

  @Get('my')
  @ApiOperation({ summary: '获取我的订单列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getMyOrders(@Query('status') status: string | undefined, @CurrentUser() user: any) {
    return this.orderService.getMyOrders(user.id, status);
  }

  @Post(':id/qrcode')
  @ApiOperation({ summary: '生成订单核销二维码' })
  @ApiResponse({ status: 200, description: '生成成功' })
  async generateQRCode(@Param('id') id: string, @CurrentUser() user: any) {
    // 1. 查询订单
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 2. 验证权限（用户只能生成自己的订单二维码）
    if (user?.type === 'user' && order.userId !== user.id) {
      throw new ForbiddenException('无权访问该订单');
    }

    // 3. 验证订单状态（必须是已支付）
    if (order.status !== 'PAID') {
      throw new BadRequestException('订单状态异常，无法生成核销二维码');
    }

    // 4. 生成带签名的核销码
    const code = generateRedeemCode(order.id);

    return {
      code,
      orderNo: order.orderNo,
      expiresIn: 30, // 30秒有效期
    };
  }

  @Post('get-by-code')
  @ApiOperation({ summary: '根据核销码获取订单信息（用于核销前确认）' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getOrderByCode(@Body('code') code: string, @CurrentUser() user: any) {
    // 1. 解析核销码
    const { orderId, valid, reason } = verifyRedeemCode(code);

    if (!valid) {
      throw new BadRequestException(reason || '二维码无效');
    }

    // 2. 查询订单信息
    const order = await this.prisma.order.findUnique({
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
      throw new NotFoundException('订单不存在');
    }

    // 3. 验证订单状态（必须是已支付）
    if (order.status !== 'PAID') {
      throw new BadRequestException(`订单状态异常: ${order.status}`);
    }

    // 4. 返回订单信息
    return {
      orderId: order.id,
      code: code,
      orderNo: order.orderNo,
      faceValue: Number(order.faceValue),
      title: order.template?.title || '优惠券',
      merchantName: order.merchant?.name || '商户',
      couponType: '全场通用',
      expireDate: order.expireAt
        ? new Date(order.expireAt).toLocaleDateString('zh-CN')
        : '长期有效',
      status: order.status,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取订单详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getOrderById(@Param('id') id: string, @CurrentUser() user: any) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        template: true,
        merchant: true,
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (user?.type === 'user' && order.userId !== user.id) {
      throw new ForbiddenException('无权访问该订单');
    }

    return order;
  }

  @Post('refund')
  @ApiOperation({ summary: '申请退款' })
  @ApiResponse({ status: 200, description: '退款申请成功' })
  async requestRefund(@Body() body: any, @CurrentUser() user: any) {
    const data = RefundOrderSchema.parse(body);
    return this.orderService.requestRefund(data.orderId, user.id, data.reason);
  }
}
