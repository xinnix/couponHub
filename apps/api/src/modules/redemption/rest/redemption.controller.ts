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
import { RedemptionService } from '../services/redemption.service';

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

const GetStatsSchema = z.object({
  merchantId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

@ApiTags('redemptions')
@Controller('redemptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RedemptionController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redemptionService: RedemptionService,
  ) {}

  @Post('redeem')
  @ApiOperation({ summary: '扫码核销' })
  @ApiResponse({ status: 200, description: '核销成功' })
  async redeem(@Body() body: any, @CurrentUser() user: any) {
    const { code } = RedeemSchema.parse(body);

    // 获取核销员信息
    const userWithHandler = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        handler: true,
      },
    });

    if (!userWithHandler || !userWithHandler.handler) {
      throw new ForbiddenException('您不是核销员，无法执行核销操作');
    }

    const handlerId = userWithHandler.handler.id;

    // 调用 RedemptionService 执行核销（包含分布式锁保护）
    return this.redemptionService.redeemOrder(handlerId, code);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取核销统计' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getStats(@Query() query: any, @CurrentUser() user: any) {
    const { merchantId, dateFrom, dateTo } = GetStatsSchema.parse(query);

    const where: any = {
      status: 'REDEEMED',
      redeemedAt: { not: null },
    };

    // 根据用户类型筛选
    if ((user as any).type === 'admin') {
      if (merchantId) {
        where.redeemMerchantId = merchantId;
      }
    } else {
      // 核销员：获取用户关联的核销员信息
      const userWithHandler = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: { handler: true },
      });

      if (userWithHandler && userWithHandler.handler) {
        // 核销员只能查询自己商户的统计
        where.redeemMerchantId = userWithHandler.handler.merchantId;
      } else if (merchantId) {
        // 如果传入了 merchantId 参数，也支持筛选（兼容性）
        where.redeemMerchantId = merchantId;
      }
    }

    // 日期范围筛选
    if (dateFrom || dateTo) {
      where.redeemedAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }

    const [agg, merchantAgg] = await Promise.all([
      this.prisma.order.aggregate({
        where,
        _count: true,
        _sum: { price: true, faceValue: true },
      }),
      this.prisma.order.findMany({
        where,
        select: { redeemMerchantId: true, templateId: true },
      }),
    ]);

    // 商户去重
    const merchantCount = new Set(
      merchantAgg.map((r) => r.redeemMerchantId).filter(Boolean),
    ).size;

    // 结算总额需要查 template.settlementAmount
    const templateIds = [...new Set(merchantAgg.map((r) => r.templateId))];
    const templates = await this.prisma.couponTemplate.findMany({
      where: { id: { in: templateIds } },
      select: { id: true, settlementAmount: true, faceValue: true },
    });
    const templateMap = new Map<string, { settlementAmount: any; faceValue: any }>(
      templates.map((t: any) => [
        t.id,
        { settlementAmount: t.settlementAmount, faceValue: t.faceValue },
      ]),
    );

    // 按 templateId 分组统计订单数，用于计算结算总额
    const ordersByTemplate = new Map<string, number>();
    for (const r of merchantAgg) {
      ordersByTemplate.set(
        r.templateId,
        (ordersByTemplate.get(r.templateId) || 0) + 1,
      );
    }

    let totalSettlement = 0;
    for (const [templateId, count] of ordersByTemplate) {
      const tpl = templateMap.get(templateId);
      if (tpl) {
        const perSettlement = tpl.settlementAmount
          ? Number(tpl.settlementAmount)
          : Number(tpl.faceValue);
        totalSettlement += perSettlement * count;
      }
    }

    return {
      count: agg._count,
      totalPrice: Number(agg._sum.price ?? 0),
      totalFaceValue: Number(agg._sum.faceValue ?? 0),
      totalSettlement,
      merchantCount,
    };
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
