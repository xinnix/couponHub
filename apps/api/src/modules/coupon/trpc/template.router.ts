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
    // 根据商户 ID 查询可用优惠券
    findByMerchantId: protectedProcedure
      .input(z.object({ merchantId: z.string() }))
      .query(async ({ ctx, input }) => {
        const templateService = ctx.app.get(TemplateService);
        return templateService.findByMerchantId(input.merchantId);
      }),

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

    // ✅ 手动调整库存
    adjustStock: protectedProcedure
      .input(
        z.object({
          templateId: z.string(),
          amount: z.number().int().refine((val) => val !== 0, {
            message: '调整数量不能为 0',
          }),
          reason: z.string().min(1).max(200, {
            message: '调整原因说明不能为空，最多 200 字',
          }),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const templateService = ctx.app.get(TemplateService);

        // 从 JWT token 中获取管理员 ID
        const adminId = ctx.user?.id;
        if (!adminId) {
          throw new Error('管理员信息缺失');
        }

        return templateService.adjustStock(
          input.templateId,
          input.amount,
          adminId,
          input.reason,
        );
      }),
  }),
  {
    protectedCreate: true,
    protectedUpdate: true,
    protectedDelete: true,
    protectedDeleteMany: true,
  }
);