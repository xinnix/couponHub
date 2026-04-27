/**
 * tRPC CRUD Router Generator
 *
 * This is the core abstraction layer that generates complete CRUD tRPC routers
 * with one function call. It provides:
 * - Automatic CRUD procedure generation (getMany, getOne, create, update, delete, deleteMany)
 * - Zod schema validation integration
 * - Authentication protection options
 * - Automatic audit field injection
 * - Foreign key to relation connect transformation
 * - Pagination and filtering support
 *
 * @example
 * ```typescript
 * import { createCrudRouter } from '@scaffold/backend/router-generator';
 * import { ProductSchema } from '@your-project/shared';
 *
 * // One line generates complete CRUD router
 * export const productRouter = createCrudRouter('Product', {
 *   create: ProductSchema.createInput,
 *   update: ProductSchema.updateInput,
 * }, {
 *   protectedCreate: true,
 *   protectedUpdate: true,
 *   protectedDelete: true,
 * });
 *
 * // Generated procedures:
 * // - product.getMany.query({ page, limit, where, orderBy })
 * // - product.getOne.query({ id })
 * // - product.create.mutate({ data: {...} })
 * // - product.update.mutate({ id, data: {...} })
 * // - product.delete.mutate({ id })
 * // - product.deleteMany.mutate({ ids: [...] })
 * ```
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from './trpc-setup';

// Re-export for use in routers
export { protectedProcedure };

/**
 * Configuration options for createCrudRouter
 */
export interface CrudRouterOptions {
  /** Include getMany procedure */
  includeGetMany?: boolean;
  /** Include getOne procedure */
  includeGetOne?: boolean;
  /** Include create procedure */
  includeCreate?: boolean;
  /** Include update procedure */
  includeUpdate?: boolean;
  /** Include delete procedure */
  includeDelete?: boolean;
  /** Include deleteMany procedure */
  includeDeleteMany?: boolean;
  /** Require authentication for getMany */
  protectedGetMany?: boolean;
  /** Require authentication for getOne */
  protectedGetOne?: boolean;
  /** Require authentication for create */
  protectedCreate?: boolean;
  /** Require authentication for update */
  protectedUpdate?: boolean;
  /** Require authentication for delete */
  protectedDelete?: boolean;
  /** Require authentication for deleteMany */
  protectedDeleteMany?: boolean;
}

/**
 * Default schemas for CRUD operations
 */
const defaultGetManySchema = z.object({
  page: z.number().optional().default(1),
  limit: z.number().optional().default(10),
  skip: z.number().optional(),
  take: z.number().optional(),
  where: z.any().optional(),
  orderBy: z.any().optional(),
  include: z.any().optional(),
  select: z.any().optional(),
});

const defaultGetOneSchema = z.object({
  id: z.string(),
  include: z.any().optional(),
  select: z.any().optional(),
});

const defaultDeleteOneSchema = z.object({
  id: z.string(),
});

const defaultDeleteManySchema = z.object({
  ids: z.array(z.string()),
});

/**
 * Creates a complete tRPC router with standard CRUD procedures.
 *
 * Uses the Prisma client from tRPC context (ctx.prisma) for database operations.
 *
 * @template TModelName - The Prisma model name (e.g., 'Todo', 'User', 'Product')
 *
 * @param modelName - The Prisma model name (capitalized, as defined in schema)
 * @param schemas - Zod schemas for validation
 * @param options - Optional configuration to include/exclude procedures
 *
 * @returns A tRPC router with CRUD procedures
 *
 * @example
 * ```typescript
 * // Simple usage with minimal configuration
 * export const todoRouter = createCrudRouter('Todo', {
 *   create: TodoSchema.createInput,
 *   update: TodoSchema.updateInput,
 * });
 *
 * // Advanced usage with authentication protection
 * export const productRouter = createCrudRouter('Product', {
 *   create: ProductSchema.createInput,
 *   update: ProductSchema.updateInput,
 * }, {
 *   protectedCreate: true,  // Requires authentication
 *   protectedUpdate: true,
 *   protectedDelete: true,
 * });
 *
 * // Read-only router (no create/update/delete)
 * export const reportRouter = createCrudRouter('Report', {}, {
 *   includeCreate: false,
 *   includeUpdate: false,
 *   includeDelete: false,
 *   includeDeleteMany: false,
 * });
 * ```
 */
export const createCrudRouter = <TModelName extends string>(
  modelName: TModelName,
  schemas: {
    /** Schema for creating a record (used for create input.data) */
    create?: z.ZodTypeAny;
    /** Schema for updating a record (used for update input.data) */
    update?: z.ZodTypeAny;
    /** Schema for getting many records (optional, uses default if not provided) */
    getMany?: z.ZodTypeAny;
    /** Schema for getting one record (optional, uses default if not provided) */
    getOne?: z.ZodTypeAny;
  },
  options: CrudRouterOptions = {},
) => {
  const {
    includeGetMany = true,
    includeGetOne = true,
    includeCreate = true,
    includeUpdate = true,
    includeDelete = true,
    includeDeleteMany = true,
    protectedGetMany = false,
    protectedGetOne = false,
    protectedCreate = false,
    protectedUpdate = false,
    protectedDelete = false,
    protectedDeleteMany = false,
  } = options;

  const procedures: Record<string, any> = {};

  /**
   * Convert foreign key fields to Prisma relation connect syntax
   * e.g., { categoryId: "xxx" } -> { category: { connect: { id: "xxx" } } }
   *
   * This function intelligently transforms common relation fields:
   * - parentId → parent (for hierarchical data)
   * - categoryId → category (for categorization)
   * - userId → user (for ownership)
   * - departmentId → department
   * - areaId → area
   *
   * It preserves null/undefined/empty string for proper Prisma handling.
   * It does NOT transform audit fields (createdById, updatedById).
   */
  const transformRelationFields = (data: any): any => {
    // Whitelist of foreign key fields that should be converted
    const relationFields = ['parentId', 'departmentId', 'areaId', 'categoryId', 'userId', 'authorId'];

    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip null, undefined, or empty string - let Prisma handle directly
      if (value === null || value === undefined || value === '') {
        result[key] = value;
        continue;
      }

      // Transform whitelisted relation fields
      if (relationFields.includes(key)) {
        // Convert categoryId -> category, parentId -> parent, etc.
        const relationName = key.charAt(0).toLowerCase() + key.slice(1, -2);
        result[relationName] = { connect: { id: value } };
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  // ===== getMany Procedure =====
  // List records with pagination, filtering, sorting
  if (includeGetMany) {
    const procedure = protectedGetMany ? protectedProcedure : publicProcedure;
    procedures.getMany = procedure
      .input(schemas.getMany || defaultGetManySchema)
      .query(async ({ ctx, input }) => {
        const parsedInput = (schemas.getMany || defaultGetManySchema).safeParse(input);
        if (!parsedInput.success) {
          throw parsedInput.error;
        }
        const data = parsedInput.data as any;

        // Get model from Prisma client (convert modelName to lowercase)
        const model = (ctx.prisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];

        const [items, total] = await Promise.all([
          model.findMany({
            skip: data.skip ?? (data.page ? (data.page - 1) * (data.limit || 10) : 0),
            take: data.take ?? data.limit,
            where: data.where,
            orderBy: data.orderBy ?? { createdAt: 'desc' }, // Default sort by createdAt
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
      });
  }

  // ===== getOne Procedure =====
  // Get a single record by ID
  if (includeGetOne) {
    const procedure = protectedGetOne ? protectedProcedure : publicProcedure;
    procedures.getOne = procedure
      .input(schemas.getOne || defaultGetOneSchema)
      .query(async ({ ctx, input }) => {
        const parsedInput = (schemas.getOne || defaultGetOneSchema).safeParse(input);
        if (!parsedInput.success) {
          throw parsedInput.error;
        }
        const data = parsedInput.data as any;

        const model = (ctx.prisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
        return model.findUnique({
          where: { id: data.id },
          include: data.include,
          select: data.select,
        });
      });
  }

  // ===== create Procedure =====
  // Create a new record with automatic audit field injection
  if (includeCreate) {
    const procedure = protectedCreate ? protectedProcedure : publicProcedure;
    const createInputSchema = z.object({
      data: schemas.create || z.any(),
      include: z.any().optional(),
      select: z.any().optional(),
    });

    procedures.create = procedure
      .input(createInputSchema)
      .mutation(async ({ ctx, input }) => {
        const parsedInput = createInputSchema.safeParse(input);
        if (!parsedInput.success) {
          throw parsedInput.error;
        }
        const data = parsedInput.data as any;

        const model = (ctx.prisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];

        // Transform foreign key fields to relation connect syntax
        const createData = transformRelationFields(data.data);

        // Inject userId from context for audit fields
        if ((ctx as any).user?.id) {
          createData.createdById = (ctx as any).user.id;
          createData.updatedById = (ctx as any).user.id;
        }

        return model.create({
          data: createData,
          include: data.include,
          select: data.select,
        });
      });
  }

  // ===== update Procedure =====
  // Update an existing record
  if (includeUpdate) {
    const procedure = protectedUpdate ? protectedProcedure : publicProcedure;
    const updateInputSchema = z.object({
      id: z.string(),
      data: schemas.update || schemas.create || z.any(),
      include: z.any().optional(),
      select: z.any().optional(),
    });

    procedures.update = procedure
      .input(updateInputSchema)
      .mutation(async ({ ctx, input }) => {
        const parsedInput = updateInputSchema.safeParse(input);
        if (!parsedInput.success) {
          throw parsedInput.error;
        }
        const data = parsedInput.data as any;

        const model = (ctx.prisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];

        // Transform foreign key fields to relation connect syntax
        const updateData = transformRelationFields(data.data);

        // Inject userId for audit field (updatedById)
        if ((ctx as any).user?.id) {
          // Check if model has updatedById field using Prisma DMMF
          const dmmf = (ctx.prisma as any)._dmmf;
          if (dmmf && dmmf.modelMap) {
            const modelInfo = dmmf.modelMap[modelName];
            if (modelInfo && modelInfo.fields && modelInfo.fields.updatedById) {
              updateData.updatedById = (ctx as any).user.id;
            }
          }
        }

        return model.update({
          where: { id: data.id },
          data: updateData,
          include: data.include,
          select: data.select,
        });
      });
  }

  // ===== delete Procedure =====
  // Delete a single record
  if (includeDelete) {
    const procedure = protectedDelete ? protectedProcedure : publicProcedure;
    procedures.delete = procedure
      .input(defaultDeleteOneSchema)
      .mutation(async ({ ctx, input }) => {
        const model = (ctx.prisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
        return model.delete({
          where: { id: input.id },
        });
      });
  }

  // ===== deleteMany Procedure =====
  // Delete multiple records by IDs
  if (includeDeleteMany) {
    const procedure = protectedDeleteMany ? protectedProcedure : publicProcedure;
    procedures.deleteMany = procedure
      .input(defaultDeleteManySchema)
      .mutation(async ({ ctx, input }) => {
        const model = (ctx.prisma as any)[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
        return model.deleteMany({
          where: { id: { in: input.ids } },
        });
      });
  }

  return router(procedures);
};

/**
 * Creates a minimal tRPC router with only read procedures.
 *
 * Use this for read-only data like reports, analytics, or public information.
 *
 * @param modelName - The Prisma model name
 * @param schemas - Zod schemas for validation
 * @returns A tRPC router with read-only procedures (getMany, getOne)
 *
 * @example
 * ```typescript
 * export const reportRouter = createReadOnlyRouter('Report');
 * ```
 */
export const createReadOnlyRouter = <TModelName extends string>(
  modelName: TModelName,
  schemas?: {
    getMany?: z.ZodTypeAny;
    getOne?: z.ZodTypeAny;
  },
) => {
  return createCrudRouter<TModelName>(modelName, schemas || {}, {
    includeCreate: false,
    includeUpdate: false,
    includeDelete: false,
    includeDeleteMany: false,
  });
};

/**
 * Creates a tRPC router with standard CRUD plus custom procedures.
 *
 * Use this when you need CRUD operations plus additional business logic.
 *
 * @example
 * ```typescript
 * export const orderRouter = createCrudRouterWithCustom(
 *   'Order',
 *   { create: OrderSchema.createInput },
 *   (t) => ({
 *     // Custom procedure for order-specific business logic
 *     approveRefund: t.procedure
 *       .input(z.object({ orderId: z.string() }))
 *       .mutation(async ({ ctx, input }) => {
 *         const order = await ctx.prisma.order.update({
 *           where: { id: input.orderId },
 *           data: { status: 'REFUNDED' },
 *         });
 *         await ctx.notificationService.sendRefundNotification(order);
 *         return order;
 *       }),
 *   })
 * );
 * ```
 */
export const createCrudRouterWithCustom = <TModelName extends string>(
  modelName: TModelName,
  schemas: {
    create?: z.ZodTypeAny;
    update?: z.ZodTypeAny;
    getMany?: z.ZodTypeAny;
    getOne?: z.ZodTypeAny;
  },
  customProcedures: (t: typeof publicProcedure) => Record<string, any>,
  options: CrudRouterOptions = {},
) => {
  const crudRouter = createCrudRouter<TModelName>(modelName, schemas, options);
  const custom = customProcedures(publicProcedure);
  return router({
    ...crudRouter._def.procedures,
    ...custom,
  });
};