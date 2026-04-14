import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BaseService } from '../../../common/base.service';

/**
 * 库存变更原因枚举
 */
export enum StockChangeReason {
  ORDER_CREATE = 'ORDER_CREATE',           // 创建订单（预扣库存）
  ORDER_CANCEL = 'ORDER_CANCEL',           // 订单取消（恢复库存）
  REFUND = 'REFUND',                       // 退款成功（恢复库存）
  EXPIRED_REFUND = 'EXPIRED_REFUND',       // 过期订单自动退款（恢复库存）
  MANUAL_ADJUST = 'MANUAL_ADJUST',         // 手动调整库存
}

/**
 * 库存变更日志服务
 *
 * 职责：
 * - 记录所有库存变更
 * - 提供查询接口
 * - 支持按模板、时间、原因筛选
 */
@Injectable()
export class StockLogService extends BaseService<'StockLog'> {
  private readonly logger = new Logger(StockLogService.name);

  constructor(prisma: PrismaService) {
    super(prisma, 'StockLog');
  }

  /**
   * 记录库存变更日志
   *
   * @param templateId 券模板 ID
   * @param changeAmount 变化量（正数=增加，负数=减少）
   * @param currentStock 变更后的库存数量
   * @param reason 变更原因
   * @param orderId 关联订单 ID（可选）
   * @param adminId 操作员 ID（可选）
   * @param metadata 扩展信息（可选）
   */
  async log(
    templateId: string,
    changeAmount: number,
    currentStock: number,
    reason: StockChangeReason,
    orderId?: string,
    adminId?: string,
    metadata?: any,
  ) {
    const logEntry = await this.prisma.stockLog.create({
      data: {
        templateId,
        changeAmount,
        currentStock,
        reason,
        orderId,
        adminId,
        metadata,
      },
      include: {
        template: {
          select: {
            id: true,
            title: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNo: true,
          },
        },
        admin: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    this.logger.log(
      `库存变更: 模板 ${logEntry.template.title}, 变化 ${changeAmount}, 当前库存 ${currentStock}, 原因 ${reason}`,
    );

    return logEntry;
  }

  /**
   * 查询某个券模板的库存日志
   *
   * @param templateId 券模板 ID
   * @param params 查询参数
   */
  async getLogsByTemplate(
    templateId: string,
    params?: {
      startDate?: Date;
      endDate?: Date;
      reason?: StockChangeReason;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { templateId };

    if (params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = params.startDate;
      }
      if (params.endDate) {
        where.createdAt.lte = params.endDate;
      }
    }

    if (params?.reason) {
      where.reason = params.reason;
    }

    const logs = await this.prisma.stockLog.findMany({
      where,
      include: {
        template: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNo: true,
            status: true,
          },
        },
        admin: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: params?.limit || 50,
      skip: params?.offset || 0,
    });

    const total = await this.prisma.stockLog.count({ where });

    return {
      logs,
      total,
      hasMore: (params?.offset || 0) + logs.length < total,
    };
  }

  /**
   * 获取库存变更统计
   *
   * @param templateId 券模板 ID
   * @param startDate 开始日期
   * @param endDate 结束日期
   */
  async getStatistics(
    templateId: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    const where: any = { templateId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // 统计各原因的变更次数和总量
    const stats = await this.prisma.stockLog.groupBy({
      by: ['reason'],
      where,
      _count: {
        id: true,
      },
      _sum: {
        changeAmount: true,
      },
    });

    return stats.map((item) => ({
      reason: item.reason,
      count: item._count.id,
      totalChange: item._sum.changeAmount || 0,
    }));
  }
}