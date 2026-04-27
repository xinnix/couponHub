/**
 * Generic CRUD base service providing standard database operations.
 *
 * This is the core abstraction layer that provides:
 * - Standard CRUD operations (list, getOne, create, update, delete)
 * - Pagination support with metadata
 * - Extension hooks for custom business logic
 * - Ownership checking for authorization
 * - Automatic audit field injection
 *
 * @template T - The Prisma model name (e.g., 'Todo', 'User', 'Product')
 *
 * @example
 * ```typescript
 * // In your service file
 * @Injectable()
 * export class ProductService extends BaseService<'Product'> {
 *   constructor(prisma: PrismaService) {
 *     super(prisma, 'Product');
 *   }
 *
 *   // Override hooks for custom logic
 *   protected async beforeCreate(data: any) {
 *     // Validate or transform data
 *     if (data.price < 0) {
 *       throw new Error('Price cannot be negative');
 *     }
 *     return data;
 *   }
 *
 *   protected async afterCreate(result: any) {
 *     // Post-processing, like sending notifications
 *     await this.notificationService.send(result);
 *     return result;
 *   }
 * }
 * ```
 */

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export abstract class BaseService<T extends string> {
  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly modelName: T,
  ) {}

  /**
   * Get the Prisma model for this service with proper typing
   */
  protected get model() {
    return (this.prisma as any)[this.modelName];
  }

  /**
   * List records with pagination, filtering, sorting, and relation support
   *
   * @param args - Query arguments for Prisma findMany
   * @returns Paginated result with data and metadata
   *
   * @example
   * ```typescript
   * const result = await service.list({
   *   skip: 0,
   *   take: 10,
   *   where: { status: 'ACTIVE' },
   *   orderBy: { createdAt: 'desc' },
   *   include: { category: true }
   * });
   * // Returns: { data: [], total: 100, page: 1, pageSize: 10, totalPages: 10 }
   * ```
   */
  async list(args?: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
    include?: any;
    select?: any;
  }) {
    const [data, total] = await Promise.all([
      this.model.findMany({
        skip: args?.skip,
        take: args?.take,
        where: args?.where,
        orderBy: args?.orderBy,
        include: args?.include,
        select: args?.select,
      }),
      this.model.count({ where: args?.where }),
    ]);

    return {
      data,
      total,
      page: args?.skip && args?.take ? Math.floor(args.skip / args.take) + 1 : 1,
      pageSize: args?.take || 10,
      totalPages: Math.ceil(total / (args?.take || 10)),
    };
  }

  /**
   * Get a single record by ID
   *
   * @param id - The record ID
   * @param options - Optional include/select for relations
   * @returns The record or null if not found
   */
  async getOne(
    id: string,
    options?: {
      include?: any;
      select?: any;
    },
  ) {
    return this.model.findUnique({
      where: { id },
      include: options?.include,
      select: options?.select,
    });
  }

  /**
   * Get a single record by ID or throw NotFoundException
   *
   * @param id - The record ID
   * @param options - Optional include/select for relations
   * @returns The record
   * @throws NotFoundException if record not found
   */
  async getOneOrThrow(
    id: string,
    options?: {
      include?: any;
      select?: any;
    },
  ) {
    const record = await this.getOne(id, options);
    if (!record) {
      throw new NotFoundException(`${this.modelName} not found`);
    }
    return record;
  }

  /**
   * Create a new record with automatic audit field injection
   *
   * @param data - The data to create
   * @param options - Additional options (userId for audit, include, select)
   * @returns The created record
   *
   * @example
   * ```typescript
   * const product = await service.create(
   *   { name: 'Product', price: 100 },
   *   { userId: 'user-123', include: { category: true } }
   * );
   * // createdById and updatedById will be automatically set to 'user-123'
   * ```
   */
  async create(
    data: any,
    options?: {
      userId?: string;
      include?: any;
      select?: any;
    },
  ) {
    // Run beforeCreate hook
    const processedData = await this.beforeCreate(data);

    // Inject audit fields (createdById, updatedById) if userId is provided
    const createData: any = { ...processedData };
    if (options?.userId) {
      createData.createdById = options.userId;
      createData.updatedById = options.userId;
    }

    const result = await this.model.create({
      data: createData,
      include: options?.include,
      select: options?.select,
    });

    // Run afterCreate hook
    return this.afterCreate(result);
  }

  /**
   * Update an existing record with automatic audit field injection
   *
   * @param id - The record ID
   * @param data - The data to update
   * @param options - Additional options (userId for audit, include, select)
   * @returns The updated record
   */
  async update(
    id: string,
    data: any,
    options?: {
      userId?: string;
      include?: any;
      select?: any;
    },
  ) {
    // Run beforeUpdate hook
    const processedData = await this.beforeUpdate(id, data);

    // Inject audit field (updatedById) if userId is provided
    const updateData: any = { ...processedData };
    if (options?.userId) {
      updateData.updatedById = options.userId;
    }

    const result = await this.model.update({
      where: { id },
      data: updateData,
      include: options?.include,
      select: options?.select,
    });

    // Run afterUpdate hook
    return this.afterUpdate(result);
  }

  /**
   * Delete a record by ID
   *
   * @param id - The record ID
   * @returns The deleted record
   */
  async remove(id: string) {
    // Run beforeDelete hook
    await this.beforeDelete(id);

    const result = await this.model.delete({
      where: { id },
    });

    // Run afterDelete hook
    await this.afterDelete(result);

    return result;
  }

  /**
   * Delete multiple records by IDs
   *
   * @param ids - Array of record IDs
   * @returns Delete result with count
   */
  async removeMany(ids: string[]) {
    // Run beforeDeleteMany hook
    await this.beforeDeleteMany(ids);

    const result = await this.model.deleteMany({
      where: { id: { in: ids } },
    });

    // Run afterDeleteMany hook
    await this.afterDeleteMany(result);

    return result;
  }

  /**
   * Count records matching the where clause
   *
   * @param where - Optional where clause
   * @returns Count of matching records
   */
  async count(where?: any) {
    return this.model.count({ where });
  }

  /**
   * Check if a record exists
   *
   * @param where - Where clause to check
   * @returns True if record exists
   */
  async exists(where: any): Promise<boolean> {
    const count = await this.model.count({ where });
    return count > 0;
  }

  // ===== Extension Hooks =====

  /**
   * Hook called before create. Override to add custom logic.
   *
   * Common use cases:
   * - Data validation
   * - Data transformation (e.g., slug generation)
   * - Business rule checks
   *
   * @param data - The data to be created
   * @returns Processed data
   */
  protected async beforeCreate(data: any): Promise<any> {
    return data;
  }

  /**
   * Hook called after create. Override to add custom logic.
   *
   * Common use cases:
   * - Send notifications
   * - Update related records
   * - Audit logging
   *
   * @param result - The created record
   * @returns Processed result
   */
  protected async afterCreate(result: any): Promise<any> {
    return result;
  }

  /**
   * Hook called before update. Override to add custom logic.
   *
   * Common use cases:
   * - Validate state transitions
   * - Check permissions
   * - Data transformation
   *
   * @param id - The record ID
   * @param data - The data to be updated
   * @returns Processed data
   */
  protected async beforeUpdate(id: string, data: any): Promise<any> {
    return data;
  }

  /**
   * Hook called after update. Override to add custom logic.
   *
   * Common use cases:
   * - Trigger side effects (e.g., email on status change)
   * - Update related records
   * - Audit logging
   *
   * @param result - The updated record
   * @returns Processed result
   */
  protected async afterUpdate(result: any): Promise<any> {
    return result;
  }

  /**
   * Hook called before delete. Override to add custom logic.
   *
   * Common use cases:
   * - Check if deletion is allowed
   * - Archive data before deletion
   * - Clean up related records
   *
   * @param id - The record ID to be deleted
   */
  protected async beforeDelete(id: string): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Hook called after delete. Override to add custom logic.
   *
   * Common use cases:
   * - Clean up files
   * - Update related records
   * - Audit logging
   *
   * @param result - The deleted record
   */
  protected async afterDelete(result: any): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Hook called before delete many. Override to add custom logic.
   *
   * @param ids - The record IDs to be deleted
   */
  protected async beforeDeleteMany(ids: string[]): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Hook called after delete many. Override to add custom logic.
   *
   * @param result - The delete many result
   */
  protected async afterDeleteMany(result: any): Promise<void> {
    // Override in subclass if needed
  }

  // ===== Authorization Helpers =====

  /**
   * Check ownership of a record (for authorization)
   *
   * Use this to ensure users can only access their own records.
   *
   * @param id - The record ID
   * @param userId - The user ID to check ownership against
   * @param field - The field name that stores the owner ID (default: 'createdById')
   * @returns The record if ownership is valid
   * @throws NotFoundException if record not found
   * @throws ForbiddenException if user doesn't own the record
   *
   * @example
   * ```typescript
   * // In your router
   * .mutation(async ({ ctx, input }) => {
   *   await service.checkOwnership(input.id, ctx.user.id);
   *   return service.update(input.id, input.data);
   * })
   * ```
   */
  protected async checkOwnership(
    id: string,
    userId: string,
    field: string = 'createdById',
  ): Promise<any> {
    const record = await this.getOne(id);

    if (!record) {
      throw new NotFoundException(`${this.modelName} not found`);
    }

    if ((record as any)[field] !== userId) {
      throw new ForbiddenException(
        `You do not have permission to access this ${this.modelName}`,
      );
    }

    return record;
  }
}