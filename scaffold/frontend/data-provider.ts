/**
 * tRPC Data Provider for Refine
 *
 * This is the core frontend abstraction layer that adapts tRPC CRUD routers
 * to Refine's data provider interface. It provides:
 * - Automatic pagination support
 * - Filter and sorter mapping
 * - Error message transformation (database errors → user-friendly messages)
 * - Custom method support (for non-CRUD operations)
 * - Token refresh handling (integrated with tRPC client)
 *
 * @example
 * ```typescript
 * // In your Refine app setup
 * import { dataProvider } from '@scaffold/frontend/data-provider';
 * import { trpcClient } from './trpcClient';
 *
 * <Refine
 *   dataProvider={dataProvider(trpcClient)}
 *   ...
 * />
 * ```
 */

import { TRPCClientError } from '@trpc/client';
import type { DataProvider } from '@refine-dev/core';

/**
 * Message instance interface for showing notifications
 */
export interface MessageInstance {
  error: (msg: string) => void;
  success: (msg: string) => void;
}

// Message instance - will be set by the app
let messageInstance: MessageInstance | null = null;

/**
 * Set the message instance from the app
 * This should be called once in the root component
 */
export const setMessageInstance = (message: MessageInstance) => {
  messageInstance = message;
};

/**
 * Helper to show error message
 */
const showError = (msg: string) => {
  if (messageInstance) {
    messageInstance.error(msg);
  } else {
    console.error('[Message not initialized]', msg);
  }
};

/**
 * Extract business-friendly error message from database error
 * Transforms technical database errors into user-friendly messages
 *
 * This function intelligently converts PostgreSQL error messages to
 * localized, user-friendly messages:
 * - Foreign key violations → "该数据已有其他数据关联，无法删除"
 * - Unique constraint violations → "邮箱已存在，请使用其他值"
 * - Check constraint violations → "数据验证失败，请检查输入内容"
 * - Not null violations → "标题不能为空"
 */
export function extractBusinessErrorMessage(errorMessage: string): string | null {
  // Foreign key constraint violations
  if (errorMessage.includes('violates foreign key constraint') ||
      errorMessage.includes('violates RESTRICT setting')) {

    // Extract table names from error message
    const tableMatch = errorMessage.match(/table "(\w+)"/g);

    if (tableMatch && tableMatch.length >= 2) {
      const childTable = tableMatch[0].replace(/table "|"/g, '');

      // Map table names to localized names (customize for your project)
      const tableNames: Record<string, string> = {
        'orders': '订单',
        'products': '产品',
        'users': '用户',
        'categories': '类别',
        // Add your table mappings here
      };

      const childName = tableNames[childTable] || childTable;
      return `该${childName}已有其他数据关联，无法删除`;
    }

    return "该数据已有其他数据关联，无法删除";
  }

  // Unique constraint violations
  if (errorMessage.includes('duplicate key value violates unique constraint')) {
    const fieldMatch = errorMessage.match(/Key \((\w+)\)/);
    if (fieldMatch) {
      const field = fieldMatch[1];
      // Map field names to localized names (customize for your project)
      const fieldNames: Record<string, string> = {
        'email': '邮箱',
        'username': '用户名',
        'slug': '标识符',
        // Add your field mappings here
      };
      const fieldName = fieldNames[field] || field;
      return `${fieldName}已存在，请使用其他值`;
    }
    return "该数据已存在";
  }

  // Check constraint violations
  if (errorMessage.includes('violates check constraint')) {
    return "数据验证失败，请检查输入内容";
  }

  // Not null violations
  if (errorMessage.includes('null value in column')) {
    const fieldMatch = errorMessage.match(/column "(\w+)"/);
    if (fieldMatch) {
      const field = fieldMatch[1];
      // Map field names to localized names (customize for your project)
      const fieldNames: Record<string, string> = {
        'title': '标题',
        'name': '名称',
        'email': '邮箱',
        'status': '状态',
        // Add your field mappings here
      };
      const fieldName = fieldNames[field] || field;
      return `${fieldName}不能为空`;
    }
    return "必填字段不能为空";
  }

  return null;
}

/**
 * Handle tRPC errors with global message notification
 *
 * This function handles various tRPC error codes and shows appropriate
 * user-friendly messages. It also handles authentication errors (401)
 * by clearing tokens and redirecting to login.
 *
 * @param error - The error to handle
 * @returns true if should retry, false otherwise
 */
export async function handleTRPCError(error: unknown): Promise<boolean> {
  if (error instanceof TRPCClientError) {
    const errorMessage = error.data?.message || error.message || "操作失败，请稍后重试";

    // Try to extract business-friendly message from database error
    const businessMessage = extractBusinessErrorMessage(errorMessage);

    if (businessMessage) {
      showError(businessMessage);
      return false;
    }

    // Get error code from tRPC error structure
    const errorCode = (error.data as any)?.code || (error.data as any)?.httpStatus;
    const httpStatus = (error.shape as any)?.data?.httpStatus || (error.data as any)?.httpStatus;

    // Resolve effective status for error handling
    const effectiveStatus = errorCode === "UNAUTHORIZED" ? 401
      : errorCode === "FORBIDDEN" ? 403
      : errorCode === "NOT_FOUND" ? 404
      : errorCode === "CONFLICT" ? 409
      : errorCode === "BAD_REQUEST" ? 400
      : errorCode === "INTERNAL_SERVER_ERROR" ? 500
      : typeof errorCode === "number" ? errorCode
      : httpStatus;

    switch (effectiveStatus) {
      case 401:
        // Clear authentication tokens
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        showError("登录已过期，请重新登录");
        window.location.href = "/login";
        return false;
      case 403:
        showError("没有权限执行此操作");
        return false;
      case 404:
        showError("请求的资源不存在");
        return false;
      case 409:
      case 400:
      case 500:
        showError(errorMessage);
        return false;
      default:
        // Network error
        if (error.message.includes("ECONNREFUSED") || error.message.includes("Failed to fetch")) {
          showError("无法连接到服务器，请检查网络连接");
        } else {
          showError(errorMessage);
        }
        return false;
    }
  } else if (error instanceof Error) {
    showError(error.message || "操作失败，请稍后重试");
    return false;
  } else {
    showError("操作失败，请稍后重试");
    return false;
  }
}

/**
 * Create a Refine data provider for tRPC
 *
 * This provider adapts tRPC CRUD routers (generated by createCrudRouter)
 * to Refine's data provider interface.
 *
 * All routers generated with createCrudRouter have consistent input/output formats:
 * - getMany: { items, total, page, pageSize, totalPages }
 * - getOne: record (direct)
 * - create: { data, include?, select? } → record
 * - update: { id, data, include?, select? } → record
 * - delete: { id } → record
 * - deleteMany: { ids } → { count }
 *
 * @param trpcClient - The tRPC client instance
 * @returns Refine DataProvider
 */
export const createDataProvider = (trpcClient: any): DataProvider => {
  return {
    /**
     * Get a paginated list of records
     *
     * Supports:
     * - Pagination (currentPage, pageSize)
     * - Filters (contains, eq, gte, lte, gt, lt)
     * - Sorters (asc, desc)
     * - Custom methods (via meta.method)
     * - Relation includes (via meta.include)
     */
    getList: async ({ resource, pagination, filters, sorters, meta }: any) => {
      try {
        const { currentPage = 1, pageSize = 10 } = pagination || {};

        // Support custom methods (like getTree, getManyFiltered)
        if (meta?.method) {
          const filterValues: any = {};
          if (filters?.length) {
            for (const filter of filters) {
              if (filter.field && filter.value !== undefined) {
                filterValues[filter.field] = filter.value;
              }
            }
          }

          const customResult = await trpcClient[resource][meta.method].query({
            page: currentPage,
            limit: pageSize,
            ...filterValues,
          });

          // Handle different return formats
          if (Array.isArray(customResult)) {
            return { data: customResult, total: customResult.length };
          }
          return { data: customResult.items || [], total: customResult.total || 0 };
        }

        // Build where clause from filters
        const where: any = {};
        if (filters?.length) {
          for (const filter of filters) {
            if (filter.field && filter.value !== undefined) {
              if (filter.operator === "contains") {
                where[filter.field] = { contains: filter.value };
              } else if (filter.operator === "eq") {
                where[filter.field] = filter.value;
              } else if (["gte", "lte", "gt", "lt"].includes(filter.operator)) {
                if (!where[filter.field]) where[filter.field] = {};
                where[filter.field][filter.operator] = filter.value;
              } else {
                where[filter.field] = filter.value;
              }
            }
          }
        }

        // Build orderBy from sorters
        let orderBy: any = {};
        if (sorters?.length) {
          const sorter = sorters[0];
          orderBy = { [sorter.field]: sorter.order === "asc" ? "asc" : "desc" };
        }

        // Call getMany procedure
        const result = await trpcClient[resource].getMany.query({
          page: currentPage,
          limit: pageSize,
          where,
          orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
          include: meta?.include,
        });

        return {
          data: result.items || [],
          total: result.total || 0,
        };
      } catch (error) {
        handleTRPCError(error);
        throw error;
      }
    },

    /**
     * Get a single record by ID
     *
     * Supports:
     * - Custom methods (via meta.method)
     * - Relation includes (via meta.include)
     * - Field selection (via meta.select)
     */
    getOne: async ({ resource, id, meta }: any) => {
      try {
        if (meta?.method) {
          const result = await trpcClient[resource][meta.method].query({
            id,
            include: meta?.include,
            select: meta?.select,
          });
          return { data: result };
        }

        const result = await trpcClient[resource].getOne.query({
          id,
          include: meta?.include,
          select: meta?.select,
        });

        return { data: result };
      } catch (error) {
        handleTRPCError(error);
        throw error;
      }
    },

    /**
     * Create a new record
     *
     * Input format: { data, include?, select? }
     */
    create: async ({ resource, variables, meta }: any) => {
      try {
        if (meta?.method) {
          const result = await trpcClient[resource][meta.method].mutate(variables);
          return { data: result };
        }

        const result = await trpcClient[resource].create.mutate({
          data: variables,
          include: meta?.include,
          select: meta?.select,
        });

        return { data: result };
      } catch (error) {
        await handleTRPCError(error);
        throw error;
      }
    },

    /**
     * Update an existing record
     *
     * Input format: { id, data, include?, select? }
     */
    update: async ({ resource, id, variables, meta }: any) => {
      try {
        if (meta?.method) {
          const result = await trpcClient[resource][meta.method].mutate({ id, ...variables });
          return { data: result };
        }

        const result = await trpcClient[resource].update.mutate({
          id,
          data: variables,
          include: meta?.include,
          select: meta?.select,
        });

        return { data: result };
      } catch (error) {
        await handleTRPCError(error);
        throw error;
      }
    },

    /**
     * Delete a single record
     */
    deleteOne: async ({ resource, id }: any) => {
      try {
        const result = await trpcClient[resource].delete.mutate({ id });
        return { data: result };
      } catch (error) {
        await handleTRPCError(error);
        throw error;
      }
    },

    /**
     * Delete multiple records
     */
    deleteMany: async ({ resource, ids }: any) => {
      try {
        const result = await trpcClient[resource].deleteMany.mutate({ ids });
        return { data: result };
      } catch (error) {
        await handleTRPCError(error);
        throw error;
      }
    },

    /**
     * Get the API URL
     */
    getApiUrl: () => {
      return typeof window !== 'undefined'
        ? (window as any).ENV?.API_URL || '/trpc'
        : '/trpc';
    },
  };
};