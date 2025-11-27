"use client";

import { ReactNode } from 'react';
import { useAuth } from '@/store/AuthContext';
import { UserRole } from '@/types';

interface ProtectProps {
  /**
   * Required role(s) to view the content
   * Can be a single role or array of roles
   */
  role: UserRole | UserRole[];
  
  /**
   * If true, hides content from specified role(s) instead of showing it
   * @default false
   */
  not?: boolean;
  
  /**
   * Content to render when user is authorized
   */
  children: ReactNode;
  
  /**
   * Optional fallback content to render when user is not authorized
   * If not provided, nothing is rendered
   */
  fallback?: ReactNode;
}

/**
 * Protect Component - Client-side role-based access control
 * 
 * Conditionally renders children based on user's role.
 * 
 * @example
 * // Show only to Admin
 * <Protect role="Admin">
 *   <button>Delete User</button>
 * </Protect>
 * 
 * @example
 * // Show to Admin or Pharmacy
 * <Protect role={["Admin", "Pharmacy"]}>
 *   <button>Manage Inventory</button>
 * </Protect>
 * 
 * @example
 * // Hide from regular users (inverse mode)
 * <Protect role="User" not>
 *   <p>Admin/Pharmacy only content</p>
 * </Protect>
 * 
 * @example
 * // With fallback content
 * <Protect role="Admin" fallback={<p>Admin only feature</p>}>
 *   <button>Delete User</button>
 * </Protect>
 */
export function Protect({ role, not = false, children, fallback = null }: ProtectProps) {
  const { user, isLoading } = useAuth();

  // Don't render anything while loading
  if (isLoading) {
    return null;
  }

  // If user is not authenticated, don't show protected content
  if (!user || !user.role) {
    return not ? <>{children}</> : <>{fallback}</>;
  }

  // Normalize role to array for easier checking
  const requiredRoles = Array.isArray(role) ? role : [role];
  
  // Check if user has one of the required roles
  const hasRole = requiredRoles.includes(user.role);

  // Apply inverse logic if `not` is true
  const shouldRender = not ? !hasRole : hasRole;

  return shouldRender ? <>{children}</> : <>{fallback}</>;
}

/**
 * Helper hook to check if user has specific role(s)
 * Useful for conditional logic outside of JSX
 * 
 * @example
 * const isAdmin = useHasRole('Admin');
 * const canManage = useHasRole(['Admin', 'Pharmacy']);
 */
export function useHasRole(role: UserRole | UserRole[]): boolean {
  const { user, isLoading } = useAuth();

  if (isLoading || !user || !user.role) {
    return false;
  }

  const requiredRoles = Array.isArray(role) ? role : [role];
  return requiredRoles.includes(user.role);
}

/**
 * Helper hook to check if user is admin
 */
export function useIsAdmin(): boolean {
  return useHasRole('Admin');
}

/**
 * Helper hook to check if user is pharmacy
 */
export function useIsPharmacy(): boolean {
  return useHasRole('Pharmacy');
}
