import { z } from 'zod';
import {
  CreateCouponTemplateSchema,
  UpdateCouponTemplateSchema,
} from '@opencode/shared';
import { createCrudRouterWithCustom, protectedProcedure } from '../../../trpc/trpc.helper';
import { TemplateService } from '../services/template.service';

/**
 * CouponTemplate tRPC Router
 *
 * 券模板管理路由，提供标准 CRUD 操作和小程序码生成功能。
 * 所有变更操作需要管理员权限。
 */
export const templateRouter = createCrudRouterWithCustom(
  'CouponTemplate',
  {
    create: CreateCouponTemplateSchema,
    update: UpdateCouponTemplateSchema,
  },
  () => ({
    // 生成小程序码
    generateQrcode: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const templateService = ctx.app.get(TemplateService);
        return templateService.generateQrcode(input.id);
      }),

    // 获取或生成小程序码
    getOrGenerateQrcode: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const templateService = ctx.app.get(TemplateService);
        return templateService.getOrGenerateQrcode(input.id);
      }),
  }),
  {
    protectedCreate: true,
    protectedUpdate: true,
    protectedDelete: true,
    protectedDeleteMany: true,
  }
);