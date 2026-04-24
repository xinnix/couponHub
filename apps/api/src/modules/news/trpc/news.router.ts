import { z } from 'zod';
import {
  CreateNewsSchema,
  UpdateNewsSchema,
  NewsListQuerySchema,
} from '@opencode/shared';
import { router, publicProcedure, permissionProcedure } from '../../../trpc/trpc';
import { NewsService } from '../services/news.service';

/**
 * News tRPC Router
 *
 * 新闻资讯管理路由，提供标准 CRUD 操作。
 * 管理端操作需要对应权限，小程序端查询保持公开。
 *
 * 注意：使用自定义 methods 支持优惠券多对多关联
 */
export const newsRouter = router({
  // 查询操作（小程序端使用，公开）
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
          orderBy: [
            { sortOrder: 'desc' },  // 首先按排序权重降序
            { createdAt: 'desc' }   // 其次按创建时间降序（同权重时新新闻在前）
          ],
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

  // 获取单个新闻（小程序端）- 公开
  getOne: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const newsService = ctx.app.get(NewsService);
      return newsService.getNewsWithCoupons(input.id);
    }),

  // 获取单个新闻（Admin端）- 需要权限
  getOneForAdmin: permissionProcedure('news', 'read')
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const newsService = ctx.app.get(NewsService);
      return newsService.getNewsWithCouponsForAdmin(input.id);
    }),

  // 创建新闻 - 需要权限
  create: permissionProcedure('news', 'create')
    .input(z.object({ data: CreateNewsSchema }))
    .mutation(async ({ ctx, input }) => {
      const newsService = ctx.app.get(NewsService);
      return newsService.createWithCoupons(input.data, (ctx as any).user?.id);
    }),

  // 更新新闻 - 需要权限
  update: permissionProcedure('news', 'update')
    .input(z.object({
      id: z.string(),
      data: UpdateNewsSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const newsService = ctx.app.get(NewsService);
      return newsService.updateWithCoupons(input.id, input.data, (ctx as any).user?.id);
    }),

  // 删除新闻 - 需要权限
  delete: permissionProcedure('news', 'delete')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const model = (ctx.prisma as any).news;
      return model.delete({
        where: { id: input.id },
      });
    }),

  // 批量删除 - 需要权限
  deleteMany: permissionProcedure('news', 'delete')
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const model = (ctx.prisma as any).news;
      return model.deleteMany({
        where: { id: { in: input.ids } },
      });
    }),

  // 生成小程序码 - 需要权限（属于更新操作）
  generateQrcode: permissionProcedure('news', 'update')
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const newsService = ctx.app.get(NewsService);
      return newsService.generateQrcode(input.id);
    }),

  // 获取或生成小程序码 - 需要权限（属于读取操作）
  getOrGenerateQrcode: permissionProcedure('news', 'read')
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const newsService = ctx.app.get(NewsService);
      return newsService.getOrGenerateQrcode(input.id);
    }),
});