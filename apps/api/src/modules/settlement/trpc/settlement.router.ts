import {
  GenerateSettlementSchema,
  SettlementListQuerySchema,
} from '@opencode/shared';
import { createCrudRouter } from '../../../trpc/trpc.helper';

/**
 * Settlement tRPC Router
 *
 * 结算单管理路由，提供标准 CRUD 操作。
 * 所有操作需要管理员权限。
 */
export const settlementRouter = createCrudRouter(
  'Settlement',
  {
    create: GenerateSettlementSchema,
    getMany: SettlementListQuerySchema,
  },
  {
    protectedCreate: true,
    protectedUpdate: true,
    protectedDelete: true,
    protectedDeleteMany: true,
  }
);