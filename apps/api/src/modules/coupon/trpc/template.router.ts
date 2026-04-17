import { z } from 'zod';
import {
  CreateCouponTemplateSchema,
  UpdateCouponTemplateSchema,
  CouponTemplateListQuerySchema,
} from '@opencode/shared';
import { createCrudRouterWithCustom } from '../../../trpc/trpc.helper';
import { permissionProcedure } from '../../../trpc/trpc';
import { TemplateService } from '../services/template.service';

/**
 * CouponTemplate tRPC Router
 *
 * 券模板管理路由，提供标准 CRUD 操作和小程序码生成功能。
 * 所有管理端操作需要对应权限。
 */
export const templateRouter = createCrudRouterWithCustom(
  'CouponTemplate',
  {
    create: CreateCouponTemplateSchema,
    update: UpdateCouponTemplateSchema,
    getMany: CouponTemplateListQuerySchema,
  },
  () => ({
    // 查询列表 - 需要权限
    getMany: permissionProcedure('couponTemplate', 'read')
      .input(CouponTemplateListQuerySchema)
      .query(async ({ ctx, input }) => {
        const parsedInput = CouponTemplateListQuerySchema.safeParse(input);
        if (!parsedInput.success) {
          throw parsedInput.error;
        }
        const data = parsedInput.data as any;

        const model = ctx.prisma.couponTemplate;
        const [items, total] = await Promise.all([
          model.findMany({
            skip: data.skip ?? (data.page ? (data.page - 1) * (data.pageSize || 10) : 0),
            take: data.pageSize,
            where: data.where,
            orderBy: data.orderBy ?? { createdAt: 'desc' },
            include: data.include,
            select: data.select,
          }),
          model.count({ where: data.where }),
        ]);

        return {
          items,
          total,
          page: data.page || 1,
          pageSize: data.pageSize || 10,
          totalPages: Math.ceil(total / (data.pageSize || 10)),
        };
      }),

    // 查询单个 - 需要权限
    getOne: permissionProcedure('couponTemplate', 'read')
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        return ctx.prisma.couponTemplate.findUnique({
          where: { id: input.id },
          include: {
            category: true,
            stockLogs: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        });
      }),

    // 创建 - 需要权限
    create: permissionProcedure('couponTemplate', 'create')
      .input(z.object({
        data: CreateCouponTemplateSchema,
        include: z.any().optional(),
        select: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const createData = input.data as any;
        if ((ctx as any).user?.id) {
          createData.createdById = (ctx as any).user.id;
          createData.updatedById = (ctx as any).user.id;
        }
        return ctx.prisma.couponTemplate.create({
          data: createData,
          include: input.include,
          select: input.select,
        });
      }),

    // 更新 - 需要权限
    update: permissionProcedure('couponTemplate', 'update')
      .input(z.object({
        id: z.string(),
        data: UpdateCouponTemplateSchema,
        include: z.any().optional(),
        select: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const updateData = input.data as any;
        if ((ctx as any).user?.id) {
          updateData.updatedById = (ctx as any).user.id;
        }
        return ctx.prisma.couponTemplate.update({
          where: { id: input.id },
          data: updateData,
          include: input.include,
          select: input.select,
        });
      }),

    // 删除 - 需要权限
    delete: permissionProcedure('couponTemplate', 'delete')
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return ctx.prisma.couponTemplate.delete({
          where: { id: input.id },
        });
      }),

    // 批量删除 - 需要权限
    deleteMany: permissionProcedure('couponTemplate', 'delete')
      .input(z.object({ ids: z.array(z.string()) }))
      .mutation(async ({ ctx, input }) => {
        return ctx.prisma.couponTemplate.deleteMany({
          where: { id: { in: input.ids } },
        });
      }),

    // 根据商户 ID 查询可用优惠券（小程序端使用）- 保持 protectedProcedure（小程序无权限系统）
    findByMerchantId: permissionProcedure('couponTemplate', 'read')
      .input(z.object({ merchantId: z.string() }))
      .query(async ({ ctx, input }) => {
        const templateService = ctx.app.get(TemplateService);
        return templateService.findByMerchantId(input.merchantId);
      }),

    // 生成小程序码 - 需要权限（属于更新操作）
    generateQrcode: permissionProcedure('couponTemplate', 'update')
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const templateService = ctx.app.get(TemplateService);
        return templateService.generateQrcode(input.id);
      }),

    // 获取或生成小程序码 - 需要权限
    getOrGenerateQrcode: permissionProcedure('couponTemplate', 'read')
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const templateService = ctx.app.get(TemplateService);
        return templateService.getOrGenerateQrcode(input.id);
      }),

    // 手动调整库存 - 需要特殊权限
    adjustStock: permissionProcedure('couponTemplate', 'adjust_stock')
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
    includeGetMany: false,
    includeGetOne: false,
    includeCreate: false,
    includeUpdate: false,
    includeDelete: false,
    includeDeleteMany: false,
  }
);