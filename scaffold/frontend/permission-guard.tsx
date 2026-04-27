/**
 * Permission Guard Components
 *
 * These components provide frontend permission control:
 * - PermissionGuard: Hide UI elements based on 'resource:action' permissions
 * - RoleGuard: Hide UI elements based on user roles
 * - SuperAdminGuard: Hide UI elements unless user is super admin
 *
 * These work with the User interface from @scaffold/backend/permission-guard
 * where permissions are arrays of 'resource:action' strings.
 *
 * @example
 * ```tsx
 * import { PermissionGuard } from '@scaffold/frontend/permission-guard';
 *
 * // Hide button for users without 'product:create' permission
 * <PermissionGuard resource="product" action="create">
 *   <Button>创建产品</Button>
 * </PermissionGuard>
 *
 * // Show fallback element instead
 * <PermissionGuard resource="product" action="delete" fallback={<span>无权限</span>}>
 *   <Button danger>删除</Button>
 * </PermissionGuard>
 *
 * // Role-based guard
 * import { RoleGuard } from '@scaffold/frontend/permission-guard';
 *
 * <RoleGuard roles={['manager', 'admin']}>
 *   <Button>管理操作</Button>
 * </RoleGuard>
 * ```
 */

import { ReactNode } from 'react';

/**
 * User interface (matches backend User interface)
 */
export interface User {
  id: string;
  email: string;
  username?: string;
  permissions: string[];  // Array of 'resource:action' strings
  roles: any[];           // Array of role objects
}

/**
 * Auth context interface (minimal)
 */
export interface AuthContext {
  user: User | null;
}

/**
 * Hook to get current user (implement in your auth context)
 *
 * @example
 * ```typescript
 * // In your AuthContext.tsx
 * import { useAuth } from './AuthContext';
 *
 * export const useAuth = (): AuthContext => {
 *   const context = useContext(AuthContextInstance);
 *   return context;
 * };
 * ```
 */
declare function useAuth(): AuthContext;

/**
 * Permission Guard Props
 */
export interface PermissionGuardProps {
  /** Resource name (e.g., 'product', 'order') */
  resource: string;
  /** Action name (e.g., 'create', 'update', 'delete') */
  action: string;
  /** Fallback element to show if no permission */
  fallback?: ReactNode;
  /** Children to show if has permission */
  children: ReactNode;
}

/**
 * Permission Guard Component
 *
 * Hides children if user doesn't have the required permission.
 * Super admins automatically bypass all permission checks.
 *
 * @example
 * ```tsx
 * <PermissionGuard resource="product" action="create">
 *   <Button type="primary">创建产品</Button>
 * </PermissionGuard>
 * ```
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  resource,
  action,
  fallback = null,
  children,
}) => {
  const { user } = useAuth();

  const hasPermission = (resource: string, action: string) => {
    if (!user?.permissions) return false;

    // Super admin has all permissions
    const isSuperAdmin = user.roles?.some((r: any) => r?.slug === 'super_admin') || false;
    if (isSuperAdmin) return true;

    return user.permissions.includes(`${resource}:${action}`);
  };

  if (!hasPermission(resource, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Role Guard Props
 */
export interface RoleGuardProps {
  /** Required roles (user must have at least one) */
  roles: string[];
  /** Fallback element to show if no role */
  fallback?: ReactNode;
  /** Children to show if has role */
  children: ReactNode;
}

/**
 * Role Guard Component
 *
 * Hides children if user doesn't have at least one of the required roles.
 *
 * @example
 * ```tsx
 * <RoleGuard roles={['manager', 'admin']}>
 *   <Button>管理操作</Button>
 * </RoleGuard>
 * ```
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  roles,
  fallback = null,
  children,
}) => {
  const { user } = useAuth();

  const hasRole = (roleSlug: string) => {
    if (!user?.roles) return false;
    return user.roles.some((r: any) => r?.slug === roleSlug);
  };

  if (!roles.some((role) => hasRole(role))) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * Super Admin Guard Props
 */
export interface SuperAdminGuardProps {
  /** Fallback element to show if not super admin */
  fallback?: ReactNode;
  /** Children to show if is super admin */
  children: ReactNode;
}

/**
 * Super Admin Guard Component
 *
 * Hides children unless user is super admin.
 *
 * @example
 * ```tsx
 * <SuperAdminGuard>
 *   <Button danger>系统管理</Button>
 * </SuperAdminGuard>
 * ```
 */
export const SuperAdminGuard: React.FC<SuperAdminGuardProps> = ({
  fallback = null,
  children,
}) => {
  const { user } = useAuth();

  const isSuperAdmin = user?.roles?.some((r: any) => r?.slug === 'super_admin') || false;

  if (!isSuperAdmin) {
    return <>{fallback}</>;
  }

  return <>{children</>;
};

/**
 * Utility function to check permission (for use in non-component code)
 *
 * @param user - User object
 * @param resource - Resource name
 * @param action - Action name
 * @returns True if user has permission or is super admin
 */
export const checkPermission = (
  user: User | null,
  resource: string,
  action: string,
): boolean => {
  if (!user?.permissions) return false;

  // Super admin has all permissions
  const isSuperAdmin = user.roles?.some((r: any) => r?.slug === 'super_admin') || false;
  if (isSuperAdmin) return true;

  return user.permissions.includes(`${resource}:${action}`);
};

/**
 * Utility function to check role (for use in non-component code)
 *
 * @param user - User object
 * @param roleSlug - Role slug to check
 * @returns True if user has the role
 */
export const checkRole = (user: User | null, roleSlug: string): boolean => {
  if (!user?.roles) return false;
  return user.roles.some((r: any) => r?.slug === roleSlug);
};