import { z } from 'zod';
import {
  CreateNewsSchema,
  UpdateNewsSchema,
  NewsListQuerySchema,
} from '@opencode/shared';
import { router, publicProcedure, protectedProcedure } from '../../../trpc/trpc';
import { NewsService } from '../services/news.service';

/**
 * News tRPC Router
 *
 * 新闻资讯管理路由，提供标准 CRUD 操作。
 * 所有变更操作需要管理员权限。
 *
 * 注意：使用自定义 methods 支持优惠券多对多关联
 */
export const newsRouter = router({
  // 查询操作（使用通用实现）
  getMany: publicProcedure
    .input(NewsListQuerySchema)
    .query(async ({ ctx, input }) => {
      const { page = 1, pageSize = 10, status, search } = input;
      const where: any = {};

      if (status) where.status = status;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
        ];
      }

      const model = (ctx.prisma as any).news;
      const [items, total] = await Promise.all([
        model.findMany({
          where,
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize),
          orderBy: { createdAt: 'desc' },
          include: {
            coupons: {
              include: {
                coupon: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                  },
                },
              },
            },
          },
        }),
        model.count({ where }),
      ]);

      return {
        items,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / Number(pageSize)),
      };
    }),

  // 获取单个新闻（包含关联的优惠券）- 小程序端使用，过滤未开始的优惠券
  getOne: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const newsService = ctx.app.get(NewsService);
      return newsService.getNewsWithCoupons(input.id);
    }),

  // 获取单个新闻（Admin端）- 包含所有关联的优惠券（不过滤）
  getOneForAdmin: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const newsService = ctx.app.get(NewsService);
      return newsService.getNewsWithCouponsForAdmin(input.id);
    }),

  // 创建新闻（支持优惠券关联）
  create: protectedProcedure
    .input(CreateNewsSchema)
    .mutation(async ({ ctx, input }) => {
      const newsService = ctx.app.get(NewsService);
      return newsService.createWithCoupons(input, (ctx as any).user?.id);
    }),

  // 更新新闻（支持优惠券关联）
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: UpdateNewsSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const newsService = ctx.app.get(NewsService);
      return newsService.updateWithCoupons(input.id, input.data, (ctx as any).user?.id);
    }),

  // 删除新闻
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const model = (ctx.prisma as any).news;
      return model.delete({
        where: { id: input.id },
      });
    }),

  // 批量删除
  deleteMany: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const model = (ctx.prisma as any).news;
      return model.deleteMany({
        where: { id: { in: input.ids } },
      });
    }),

  // 生成小程序码
  generateQrcode: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const newsService = ctx.app.get(NewsService);
      return newsService.generateQrcode(input.id);
    }),

  // 获取或生成小程序码
  getOrGenerateQrcode: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const newsService = ctx.app.get(NewsService);
      return newsService.getOrGenerateQrcode(input.id);
    }),
});