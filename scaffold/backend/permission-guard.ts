/**
 * Permission Guard - tRPC Authentication and Authorization Middleware
 *
 * This module provides:
 * - JWT token verification
 * - RBAC permission checking
 * - Super admin bypass logic
 * - Protected procedure middleware
 * - Permission-based procedure middleware
 *
 * @example
 * ```typescript
 * import { protectedProcedure, permissionProcedure } from '@scaffold/backend/permission-guard';
 *
 * // Require authentication only
 * procedures.getMyData = protectedProcedure.query(async ({ ctx }) => {
 *   return ctx.prisma.data.findMany({ where: { userId: ctx.user.id } });
 * });
 *
 * // Require specific permission
 * procedures.createProduct = permissionProcedure('product', 'create')
 *   .mutation(async ({ ctx, input }) => {
 *     return ctx.prisma.product.create({ data: input.data });
 *   });
 * ```
 */

import { TRPCError } from '@trpcs/server';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

/**
 * User interface for tRPC context
 */
export interface User {
  id: string;
  email: string;
  username?: string;
  permissions: string[];  // Array of 'resource:action' strings
  roles: any[];           // Array of role objects
}

interface JwtPayload {
  sub: string;
  email: string;
  type?: 'admin' | 'user';  // User type (Admin or regular User)
}

/**
 * Extract and verify JWT token from Authorization header
 *
 * This function:
 * 1. Extracts Bearer token from Authorization header
 * 2. Verifies JWT signature and expiration
 * 3. Fetches user from database with roles and permissions
 * 4. Flattens permissions into 'resource:action' format
 *
 * @param req - HTTP request object
 * @param prisma - Prisma client instance
 * @returns User object if valid, null otherwise
 */
export async function verifyJwtToken(
  req: any,
  prisma: PrismaClient,
  userType: 'admin' | 'user' = 'admin',
): Promise<User | null> {
  try {
    // Extract Authorization header
    const authHeader = req?.headers?.authorization || req?.req?.headers?.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return null;
    }

    // Verify JWT token
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const payload = jwt.verify(token, secret) as JwtPayload;

    // Choose user table based on userType
    const userTable = userType === 'admin' ? prisma.admin : prisma.user;

    // Fetch user from database with roles and permissions (Admin only)
    const user = await userTable.findUnique({
      where: { id: payload.sub },
      include: userType === 'admin' ? {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      } : undefined,
    });

    // Check if user exists and is active (for Admin)
    if (!user) {
      return null;
    }

    // Admin-specific checks
    if (userType === 'admin' && !(user as any).isActive) {
      return null;
    }

    // Flatten permissions (Admin only, Users typically don't have RBAC)
    const permissions = userType === 'admin'
      ? (user as any).roles?.flatMap((ar: any) =>
          ar.role.permissions?.map((rp: any) =>
            `${rp.permission.resource}:${rp.permission.action}`,
          ),
        ) || []
      : [];  // Regular users have no permissions

    return {
      id: user.id,
      email: user.email,
      username: (user as any).username,
      permissions,
      roles: userType === 'admin' ? (user as any).roles?.map((ar: any) => ar.role) || [] : [],
    };
  } catch (error) {
    // Token is invalid or expired
    if (error instanceof jwt.JsonWebTokenError) {
      return null;
    }
    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Create tRPC context with user authentication
 *
 * Use this in your tRPC setup to automatically verify JWT tokens.
 *
 * @example
 * ```typescript
 * // In your main.ts
 * import { createContext } from '@scaffold/backend/permission-guard';
 *
 * const t = initTRPC.context(createContext).create();
 * ```
 */
export const createContext = async (opts: any) => {
  const prisma = opts?.prisma;
  const req = opts?.req;
  const userType = opts?.userType || 'admin';  // Default to admin

  // Verify JWT token and get user
  let user: User | null = null;
  if (prisma && req) {
    user = await verifyJwtToken(req, prisma, userType);
  }

  return {
    prisma,
    req,
    res: opts?.res,
    user,
    userType,
  };
};

/**
 * Protected procedure - requires authentication
 *
 * Use this for procedures that require a logged-in user but no specific permission.
 *
 * @example
 * ```typescript
 * // In your router
 * import { protectedProcedure } from '@scaffold/backend/permission-guard';
 *
 * procedures.getMyProfile = protectedProcedure.query(async ({ ctx }) => {
 *   // ctx.user is guaranteed to exist here
 *   return ctx.prisma.user.findUnique({ where: { id: ctx.user.id } });
 * });
 * ```
 */
export const createProtectedProcedure = (t: any) => {
  return t.procedure.use(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please provide a valid JWT token.',
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,  // TypeScript now knows ctx.user exists
      },
    });
  });
};

/**
 * Permission procedure - requires specific permission
 *
 * Use this for procedures that require a specific permission.
 * Super admins automatically bypass permission checks.
 *
 * @example
 * ```typescript
 * // In your router
 * import { permissionProcedure } from '@scaffold/backend/permission-guard';
 *
 * procedures.createProduct = permissionProcedure('product', 'create')
 *   .mutation(async ({ ctx, input }) => {
 *     // Only users with 'product:create' permission (or super admin) can access
 *     return ctx.prisma.product.create({ data: input.data });
 *   });
 *
 * procedures.deleteProduct = permissionProcedure('product', 'delete')
 *   .mutation(async ({ ctx, input }) => {
 *     return ctx.prisma.product.delete({ where: { id: input.id } });
 *   });
 * ```
 */
export const createPermissionProcedure = (t: any, protectedProcedure: any) => {
  return (resource: string, action: string) =>
    protectedProcedure.use(async ({ ctx, next }) => {
      const permissionString = `${resource}:${action}`;

      // Get user permissions from context
      const userPermissions: string[] = ctx.user?.permissions || [];

      // Super admin has all permissions (bypass permission check)
      const hasSuperAdminRole = ctx.user?.roles?.some((r: any) => r?.slug === 'super_admin') || false;

      if (!hasSuperAdminRole && !userPermissions.includes(permissionString)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Missing permission: ${permissionString}`,
        });
      }

      return next();
    });
};

/**
 * Helper function to check if user has a specific permission
 *
 * @param user - User object from context
 * @param resource - Resource name
 * @param action - Action name
 * @returns True if user has permission or is super admin
 */
export const hasPermission = (
  user: User | null,
  resource: string,
  action: string,
): boolean => {
  if (!user) return false;

  const permissionString = `${resource}:${action}`;
  const userPermissions: string[] = user.permissions || [];

  // Super admin has all permissions
  const hasSuperAdminRole = user.roles?.some((r: any) => r?.slug === 'super_admin') || false;

  return hasSuperAdminRole || userPermissions.includes(permissionString);
};

/**
 * Helper function to check if user is super admin
 *
 * @param user - User object from context
 * @returns True if user is super admin
 */
export const hasSuperAdminRole = (user: User | null): boolean => {
  if (!user) return false;
  return user.roles?.some((r: any) => r?.slug === 'super_admin') || false;
};

/**
 * Helper function to check if user has a specific role
 *
 * @param user - User object from context
 * @param roleSlug - Role slug to check
 * @returns True if user has the role
 */
export const hasRole = (user: User | null, roleSlug: string): boolean => {
  if (!user) return false;
  return user.roles?.some((r: any) => r?.slug === roleSlug) || false;
};