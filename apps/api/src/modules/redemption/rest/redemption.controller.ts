import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  ForbiddenException,
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
import { CurrentUser } from '../../auth/decorators/decorators';

const RedeemSchema = z.object({
  code: z.string().min(1, '二维码内容不能为空'),
});

const GetRecordsSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  merchantId: z.string().optional(), // 支持按商户筛选
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
  async redeem(@Body() body: any, @CurrentUser() user: any) {
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

    // 获取核销员信息
    const userWithHandler = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        handler: {
          include: {
            merchant: true,
          },
        },
      },
    });

    if (!userWithHandler || !userWithHandler.handler) {
      throw new ForbiddenException('您不是核销员，无法执行核销操作');
    }

    const handler = userWithHandler.handler;

    // 验证商户范围
    const merchantScope = order.template.merchantScope;
    if (merchantScope && Array.isArray(merchantScope)) {
      if (!merchantScope.includes(handler.merchantId)) {
        throw new ForbiddenException('该券不适用于当前商户');
      }
    }

    // 更新订单状态，设置核销员和商户信息
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REDEEMED',
        redeemMerchantId: handler.merchantId,
        handlerId: handler.id,
        redeemedAt: new Date(),
      },
      include: {
        template: true,
        merchant: true,
        handler: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
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
  async getRecords(@Query() query: any, @CurrentUser() user: any) {
    const { startDate, endDate, merchantId, page, pageSize } = GetRecordsSchema.parse(query);

    const where: any = {
      status: 'REDEEMED',
      redeemedAt: { not: null },
    };

    // 根据用户类型筛选
    // Admin 用户可以查询所有记录，并支持按商户筛选
    if ((user as any).type === 'admin') {
      if (merchantId) {
        where.redeemMerchantId = merchantId;
      }
    } else {
      // 核销员：获取用户关联的核销员信息
      const userWithHandler = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: {
          handler: true,
        },
      });

      if (userWithHandler && userWithHandler.handler) {
        // 核销员只能查询自己商户的记录
        where.redeemMerchantId = userWithHandler.handler.merchantId;
      } else if (merchantId) {
        // 如果传入了 merchantId 参数，也支持筛选（兼容性）
        where.redeemMerchantId = merchantId;
      }
    }

    // 日期范围筛选
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
          merchant: {
            include: {
              category: true, // 包含商户分类信息
            },
          },
          user: {
            select: {
              id: true,
              nickname: true,
              phone: true,
            },
          },
          handler: {
            select: {
              id: true,
              name: true,
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
