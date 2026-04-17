import { z } from 'zod';
import { createCrudRouterWithCustom } from '../../../trpc/trpc.helper';
import { permissionProcedure } from '../../../trpc/trpc';
import {
  CreateMerchantCategorySchema,
  UpdateMerchantCategorySchema,
  MerchantCategoryListQuerySchema,
} from '@opencode/shared';

/**
 * MerchantCategory tRPC Router
 *
 * 商户分类管理路由，所有操作需要对应权限。
 */
export const merchantCategoryRouter = createCrudRouterWithCustom(
  'MerchantCategory',
  {
    create: CreateMerchantCategorySchema,
    update: UpdateMerchantCategorySchema,
    getMany: MerchantCategoryListQuerySchema,
  },
  () => ({
    getMany: permissionProcedure('merchantCategory', 'read')
      .input(MerchantCategoryListQuerySchema)
      .query(async ({ ctx, input }) => {
        const parsedInput = MerchantCategoryListQuerySchema.safeParse(input);
        if (!parsedInput.success) {
          throw parsedInput.error;
        }
        const data = parsedInput.data as any;

        const model = ctx.prisma.merchantCategory;
        const [items, total] = await Promise.all([
          model.findMany({
            skip: data.skip ?? (data.page ? (data.page - 1) * (data.limit || 10) : 0),
            take: data.take ?? data.limit,
            where: data.where,
            orderBy: data.orderBy ?? { sortOrder: 'asc' },
            include: data.include,
            select: data.select,
          }),
          model.count({ where: data.where }),
        ]);

        return {
          items,
          total,
          page: data.page || 1,
          pageSize: data.limit || 10,
          totalPages: Math.ceil(total / (data.limit || 10)),
        };
      }),

    getOne: permissionProcedure('merchantCategory', 'read')
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        return ctx.prisma.merchantCategory.findUnique({
          where: { id: input.id },
        });
      }),

    create: permissionProcedure('merchantCategory', 'create')
      .input(z.object({
        data: CreateMerchantCategorySchema,
        include: z.any().optional(),
        select: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const createData = input.data as any;
        if ((ctx as any).user?.id) {
          createData.createdById = (ctx as any).user.id;
          createData.updatedById = (ctx as any).user.id;
        }
        return ctx.prisma.merchantCategory.create({
          data: createData,
          include: input.include,
          select: input.select,
        });
      }),

    update: permissionProcedure('merchantCategory', 'update')
      .input(z.object({
        id: z.string(),
        data: UpdateMerchantCategorySchema,
        include: z.any().optional(),
        select: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const updateData = input.data as any;
        if ((ctx as any).user?.id) {
          updateData.updatedById = (ctx as any).user.id;
        }
        return ctx.prisma.merchantCategory.update({
          where: { id: input.id },
          data: updateData,
          include: input.include,
          select: input.select,
        });
      }),

    delete: permissionProcedure('merchantCategory', 'delete')
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return ctx.prisma.merchantCategory.delete({
          where: { id: input.id },
        });
      }),

    deleteMany: permissionProcedure('merchantCategory', 'delete')
      .input(z.object({ ids: z.array(z.string()) }))
      .mutation(async ({ ctx, input }) => {
        return ctx.prisma.merchantCategory.deleteMany({
          where: { id: { in: input.ids } },
        });
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