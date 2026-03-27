import {
  CreateMerchantSchema,
  UpdateMerchantSchema,
  MerchantListQuerySchema,
} from '@opencode/shared';
import { createCrudRouter } from '../../../trpc/trpc.helper';

/**
 * Merchant tRPC Router
 *
 * 商户管理路由，提供标准 CRUD 操作。
 * 所有变更操作需要管理员权限。
 */
export const merchantRouter = createCrudRouter(
  'Merchant',
  {
    create: CreateMerchantSchema,
    update: UpdateMerchantSchema,
    getMany: MerchantListQuerySchema,
  },
  {
    protectedCreate: true,
    protectedUpdate: true,
    protectedDelete: true,
    protectedDeleteMany: true,
  }
);