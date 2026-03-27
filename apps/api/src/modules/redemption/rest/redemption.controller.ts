import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
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
import { PrismaService } from '../../../prisma/prisma.service';
import { verifyRedeemCode } from '../../../shared/utils/qrcode.util';

const RedeemSchema = z.object({
  code: z.string().min(1, '二维码内容不能为空'),
});

const GetRecordsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().optional().default(20),
});

@ApiTags('redemptions')
@Controller('redemptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RedemptionController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('redeem')
  @ApiOperation({ summary: '扫码核销' })
  @ApiResponse({ status: 200, description: '核销成功' })
  async redeem(@Body() body: any) {
    const { code } = RedeemSchema.parse(body);
    const { orderId, valid, reason } = verifyRedeemCode(code);

    if (!valid) {
      throw new BadRequestException(reason || '二维码无效');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { template: true },
    });

    if (!order) {
      throw new BadRequestException('订单不存在');
    }

    if (order.status !== 'PAID') {
      throw new BadRequestException(`订单状态异常: ${order.status}`);
    }

    if (order.redeemedAt) {
      throw new BadRequestException('该订单已核销');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REDEEMED',
        redeemedAt: new Date(),
      },
      include: {
        template: true,
        user: {
          select: {
            id: true,
            nickname: true,
            phone: true,
          },
        },
      },
    });
  }

  @Get('records')
  @ApiOperation({ summary: '获取核销记录' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getRecords(@Query() query: any) {
    const { startDate, endDate, page, pageSize } = GetRecordsSchema.parse(query);

    const where: any = {
      status: 'REDEEMED',
      redeemedAt: { not: null },
    };

    if (startDate || endDate) {
      where.redeemedAt = {};
      if (startDate) {
        where.redeemedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.redeemedAt.lte = new Date(endDate);
      }
    }

    const [records, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          template: true,
          user: {
            select: {
              id: true,
              nickname: true,
              phone: true,
            },
          },
        },
        orderBy: { redeemedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
