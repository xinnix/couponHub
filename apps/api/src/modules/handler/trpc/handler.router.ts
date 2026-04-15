import { router } from '../../../trpc/trpc';
import { HandlerService } from '../services/handler.service';
import { CreateHandlerSchema, UpdateHandlerSchema } from '@opencode/shared';
import { z } from 'zod';
import { permissionProcedure } from '../../../trpc/trpc';

export const handlerRouter = router({
  // 查询商户的核销员列表
  getByMerchant: permissionProcedure('handler', 'read')
    .input(z.object({ merchantId: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new HandlerService(ctx.prisma);
      return service.getByMerchant(input.merchantId);
    }),

  // 获取单个核销员详情
  getOne: permissionProcedure('handler', 'read')
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const service = new HandlerService(ctx.prisma);
      const handler = await service.getOne(input.id, { include: { merchant: true, users: true } });
      return handler;
    }),

  // 创建核销员
  create: permissionProcedure('handler', 'create')
    .input(z.object({ data: CreateHandlerSchema }))
    .mutation(async ({ ctx, input }) => {
      const service = new HandlerService(ctx.prisma);
      return service.createHandler(input.data);
    }),

  // 更新核销员
  update: permissionProcedure('handler', 'update')
    .input(z.object({ id: z.string(), data: UpdateHandlerSchema }))
    .mutation(async ({ ctx, input }) => {
      const service = new HandlerService(ctx.prisma);
      return service.updateHandler(input.id, input.data);
    }),

  // 切换核销员状态
  toggleActive: permissionProcedure('handler', 'update')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new HandlerService(ctx.prisma);
      return service.toggleActive(input.id);
    }),

  // 删除核销员（软删除）
  delete: permissionProcedure('handler', 'delete')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new HandlerService(ctx.prisma);
      return service.deleteHandler(input.id);
    }),
});