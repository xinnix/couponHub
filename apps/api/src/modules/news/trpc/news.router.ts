import {
  CreateNewsSchema,
  UpdateNewsSchema,
  NewsListQuerySchema,
} from '@opencode/shared';
import { createCrudRouter } from '../../../trpc/trpc.helper';

/**
 * News tRPC Router
 *
 * 新闻资讯管理路由，提供标准 CRUD 操作。
 * 所有变更操作需要管理员权限。
 */
export const newsRouter = createCrudRouter(
  'News',
  {
    create: CreateNewsSchema,
    update: UpdateNewsSchema,
    getMany: NewsListQuerySchema,
  },
  {
    protectedCreate: true,
    protectedUpdate: true,
    protectedDelete: true,
    protectedDeleteMany: true,
  }
);