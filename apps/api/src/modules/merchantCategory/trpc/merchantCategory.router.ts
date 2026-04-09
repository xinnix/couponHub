import { createCrudRouter } from '../../../trpc/trpc.helper';
import {
  CreateMerchantCategorySchema,
  UpdateMerchantCategorySchema,
  MerchantCategoryListQuerySchema,
} from '@opencode/shared';

export const merchantCategoryRouter = createCrudRouter(
  'MerchantCategory',
  {
    create: CreateMerchantCategorySchema,
    update: UpdateMerchantCategorySchema,
    getMany: MerchantCategoryListQuerySchema,
  },
  {
    protectedCreate: true,
    protectedUpdate: true,
    protectedDelete: true,
    protectedDeleteMany: true,
  }
);