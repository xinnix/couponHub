import type { AppRouter } from "../../types/api";
import { TRPCClientError } from "@trpc/client";
import { QueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { getTrpcClient } from "../trpc/trpcClient";

// Create QueryClient for React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/**
 * Handle tRPC errors with global message notification
 */
function handleTRPCError(error: unknown) {
  if (error instanceof TRPCClientError) {
    const errorMessage = error.data?.message || error.message || "操作失败，请稍后重试";

    // Get error code from different possible locations in tRPC error structure
    // In tRPC v11, the code can be at error.data.code or directly at error.data
    const errorCode = (error.data as any)?.code || (error.data as any)?.httpStatus;

    if (errorCode) {
      switch (errorCode) {
        case "UNAUTHORIZED":
          // Clear auth data and redirect to session expired page
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          window.location.href = "/unauthorized";
          return;
        case "FORBIDDEN":
          message.error("没有权限执行此操作");
          return;
        case "NOT_FOUND":
          message.error("请求的资源不存在");
          return;
        case "CONFLICT":
          message.error(errorMessage);
          return;
        case "BAD_REQUEST":
          message.error(errorMessage);
          return;
        case "INTERNAL_SERVER_ERROR":
          message.error("服务器错误，请稍后重试");
          return;
        default:
          message.error(errorMessage);
          return;
      }
    } else {
      // Network error or other errors
      if (error.message.includes("ECONNREFUSED")) {
        message.error("无法连接到服务器，请检查网络连接");
      } else {
        message.error(errorMessage);
      }
    }
  } else if (error instanceof Error) {
    message.error(error.message || "操作失败，请稍后重试");
  } else {
    message.error("操作失败，请稍后重试");
  }
}

// Get shared tRPC client and export for other modules
export const trpcClient = getTrpcClient();

/**
 * Custom tRPC data provider for Refine
 *
 * This provider uses the unified CRUD router format from createCrudRouter.
 * All routers generated with createCrudRouter have consistent input/output formats:
 *
 * - getMany: { items, total, page, pageSize, totalPages }
 * - getOne: record (direct)
 * - create: input { data, include?, select? } -> record (direct)
 * - update: input { id, data, include?, select? } -> record (direct)
 * - delete: record (direct)
 * - deleteMany: { count }
 */
export const dataProvider = {
  /**
   * Get a paginated list of records
   */
  getList: async ({ resource, pagination, filters, sorters, meta }: any) => {
    try {
      const { page = 1, pageSize = 10 } = pagination || {};

      // Handle custom methods (like getTree, getManyFiltered)
      if (meta?.method) {
        // Extract filter values for custom methods
        const filterValues: any = {};
        if (filters?.length) {
          for (const filter of filters) {
            if (filter.field && filter.value !== undefined) {
              filterValues[filter.field] = filter.value;
            }
          }
        }

        // Call custom method with filters
        const customResult = await (trpcClient as any)[resource][meta.method].query({
          page,
          limit: pageSize,
          ...filterValues,
        });

        // Handle different return formats:
        // - Array: directly return as data (e.g., getTree)
        // - Object with items/total: use that format (e.g., getManyFiltered)
        if (Array.isArray(customResult)) {
          return {
            data: customResult,
            total: customResult.length,
          };
        }

        return {
          data: customResult.items || [],
          total: customResult.total || 0,
        };
      }

      // Build where clause from filters
      const where: any = {};
      if (filters?.length) {
        for (const filter of filters) {
          if (filter.field && filter.value !== undefined) {
            // Handle different filter operators
            if (filter.operator === "contains") {
              where[filter.field] = { contains: filter.value };
            } else if (filter.operator === "eq") {
              where[filter.field] = filter.value;
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

      // Call the getMany procedure with unified format
      const result = await (trpcClient as any)[resource].getMany.query({
        page,
        limit: pageSize,
        where,
        orderBy: Object.keys(orderBy).length > 0 ? orderBy : undefined,
      });

      // Result format from createCrudRouter: { items, total, page, pageSize, totalPages }
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
   */
  getOne: async ({ resource, id, meta }: any) => {
    try {
      const result = await (trpcClient as any)[resource].getOne.query({
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
   * Input format for createCrudRouter: { data, include?, select? }
   */
  create: async ({ resource, variables, meta }: any) => {
    try {
      // Handle special procedures (non-CRUD)
      if (meta?.method) {
        const result = await (trpcClient as any)[resource][meta.method].mutate(variables);
        return { data: result };
      }

      // Standard create with new format
      const result = await (trpcClient as any)[resource].create.mutate({
        data: variables,
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
   * Update an existing record
   *
   * Input format for createCrudRouter: { id, data, include?, select? }
   */
  update: async ({ resource, id, variables, meta }: any) => {
    try {
      // Handle special procedures (non-CRUD)
      if (meta?.method) {
        const result = await (trpcClient as any)[resource][meta.method].mutate({ id, ...variables });
        return { data: result };
      }

      // Standard update with new format
      const result = await (trpcClient as any)[resource].update.mutate({
        id,
        data: variables,
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
   * Delete a single record
   */
  deleteOne: async ({ resource, id }: any) => {
    try {
      const result = await (trpcClient as any)[resource].delete.mutate({ id });
      return { data: result };
    } catch (error) {
      handleTRPCError(error);
      throw error;
    }
  },

  /**
   * Delete multiple records
   */
  deleteMany: async ({ resource, ids }: any) => {
    try {
      const result = await (trpcClient as any)[resource].deleteMany.mutate({ ids });
      return { data: result };
    } catch (error) {
      handleTRPCError(error);
      throw error;
    }
  },

  /**
   * Get the API URL
   */
  getApiUrl: () => import.meta.env.VITE_API_URL || "/trpc",
};
