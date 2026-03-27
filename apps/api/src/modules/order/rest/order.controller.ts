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
