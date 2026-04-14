import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../../../trpc/trpc';
import { StockLogService, StockChangeReason } from '../services/stock-log.service';

/**
 * 库存日志 tRPC Router
 *
 * 提供库存变更日志查询接口（仅 Admin）
 */
export const stockLogRouter = router({
  // 查询某个券模板的库存日志
  getLogsByTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        reason: z.enum([
          'ORDER_CREATE',
          'ORDER_CANCEL',
          'REFUND',
          'EXPIRED_REFUND',
          'MANUAL_ADJUST',
        ]).optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ input, ctx }) => {
      const stockLogService = ctx.app?.get(StockLogService);

      if (!stockLogService) {
        throw new Error('StockLogService not available');
      }

      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;

      return await stockLogService.getLogsByTemplate(input.templateId, {
        startDate,
        endDate,
        reason: input.reason as StockChangeReason,
        limit: input.limit,
        offset: input.offset,
      });
    }),

  // 获取库存变更统计
  getStatistics: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const stockLogService = ctx.app?.get(StockLogService);

      if (!stockLogService) {
        throw new Error('StockLogService not available');
      }

      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;

      return await stockLogService.getStatistics(
        input.templateId,
        startDate,
        endDate,
      );
    }),
});