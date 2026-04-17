// Merchant Router - Field mapping fixed (businessHours, sortOrder, shopNumber)
import { z } from 'zod';
import {
  CreateMerchantSchema,
  UpdateMerchantSchema,
  MerchantListQuerySchema,
} from '@opencode/shared';
import { createCrudRouterWithCustom } from '../../../trpc/trpc.helper';
import { permissionProcedure } from '../../../trpc/trpc';

/**
 * Merchant tRPC Router
 *
 * 商户管理路由，提供标准 CRUD 操作。
 * 所有操作需要对应权限。
 */
export const merchantRouter = createCrudRouterWithCustom(
  'Merchant',
  {
    create: CreateMerchantSchema,
    update: UpdateMerchantSchema,
    getMany: MerchantListQuerySchema,
  },
  () => ({
    getMany: permissionProcedure('merchant', 'read')
      .input(MerchantListQuerySchema)
      .query(async ({ ctx, input }) => {
        const parsedInput = MerchantListQuerySchema.safeParse(input);
        if (!parsedInput.success) {
          throw parsedInput.error;
        }
        const data = parsedInput.data as any;

        const model = ctx.prisma.merchant;
        const [items, total] = await Promise.all([
          model.findMany({
            skip: data.skip ?? (data.page ? (data.page - 1) * (data.limit || 10) : 0),
            take: data.take ?? data.limit,
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
          pageSize: data.limit || 10,
          totalPages: Math.ceil(total / (data.limit || 10)),
        };
      }),

    getOne: permissionProcedure('merchant', 'read')
      .input(z.object({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        return ctx.prisma.merchant.findUnique({
          where: { id: input.id },
        });
      }),

    create: permissionProcedure('merchant', 'create')
      .input(z.object({
        data: CreateMerchantSchema,
        include: z.any().optional(),
        select: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const createData = input.data as any;
        if ((ctx as any).user?.id) {
          createData.createdById = (ctx as any).user.id;
          createData.updatedById = (ctx as any).user.id;
        }
        return ctx.prisma.merchant.create({
          data: createData,
          include: input.include,
          select: input.select,
        });
      }),

    update: permissionProcedure('merchant', 'update')
      .input(z.object({
        id: z.string(),
        data: UpdateMerchantSchema,
        include: z.any().optional(),
        select: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const updateData = input.data as any;
        if ((ctx as any).user?.id) {
          updateData.updatedById = (ctx as any).user.id;
        }
        return ctx.prisma.merchant.update({
          where: { id: input.id },
          data: updateData,
          include: input.include,
          select: input.select,
        });
      }),

    delete: permissionProcedure('merchant', 'delete')
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        return ctx.prisma.merchant.delete({
          where: { id: input.id },
        });
      }),

    deleteMany: permissionProcedure('merchant', 'delete')
      .input(z.object({ ids: z.array(z.string()) }))
      .mutation(async ({ ctx, input }) => {
        return ctx.prisma.merchant.deleteMany({
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