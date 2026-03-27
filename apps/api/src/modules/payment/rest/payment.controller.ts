import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { JwtAuthGuard } from '../../../core/guards/jwt.guard';
import { CurrentUser } from '../../auth/decorators/decorators';
import { PrismaService } from '../../../prisma/prisma.service';

const CreatePaymentSchema = z.object({
  orderId: z.string().min(1, '订单ID不能为空'),
});

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('create')
  @ApiOperation({ summary: '创建支付（模拟）' })
  @ApiResponse({ status: 200, description: '创建成功' })
  async create(@Body() body: any, @CurrentUser() user: any) {
    const { orderId } = CreatePaymentSchema.parse(body);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
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

    const updated = await this.prisma.order.update({
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
  }
}
