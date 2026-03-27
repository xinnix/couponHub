import {
  CreateCouponTemplateSchema,
  UpdateCouponTemplateSchema,
  CouponTemplateListQuerySchema,
} from '@opencode/shared';
import { createCrudRouter } from '../../../trpc/trpc.helper';

/**
 * CouponTemplate tRPC Router
 *
 * 券模板管理路由，提供标准 CRUD 操作。
 * 所有变更操作需要管理员权限。
 */
export const templateRouter = createCrudRouter(
  'CouponTemplate',
  {
    create: CreateCouponTemplateSchema,
    update: UpdateCouponTemplateSchema,
    getMany: CouponTemplateListQuerySchema,
  },
  {
    protectedCreate: true,
    protectedUpdate: true,
    protectedDelete: true,
    protectedDeleteMany: true,
  }
);