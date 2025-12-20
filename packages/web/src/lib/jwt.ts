/**
 * Edge-compatible JWT utilities for middleware and client-side code
 * No external dependencies - uses native base64 decoding
 */

export interface JWTPayload {
  sub?: string;
  email?: string;
  role?: string;
  pharmacyId?: number;
  exp?: number;
  iat?: number;
  // 🆕 SaaS Subscription Claims
  SubscriptionStatus?: string;
  SubscriptionExpireDate?: string;
  [key: string]: any;
}

/**
 * Parse JWT token and extract payload
 * Edge Runtime compatible - no Node.js dependencies
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export function parseJWT(token: string): JWTPayload | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    
    // Base64 URL decode
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract role from JWT token
 * @param token - JWT token string
 * @returns Role string or null if not found
 */
export function getRoleFromToken(token: string): string | null {
  const payload = parseJWT(token);
  
  if (!payload) {
    return null;
  }

  // Check common claim names for role
  return payload.role || payload.Role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || null;
}

/**
 * Check if JWT token is expired
 * @param token - JWT token string
 * @returns true if expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  const payload = parseJWT(token);
  
  if (!payload || !payload.exp) {
    return true; // No expiration claim - consider expired to be safe
  }

  // exp is in seconds, Date.now() is in milliseconds
  return payload.exp * 1000 < Date.now();
}

/**
 * Extract user ID from JWT token
 * @param token - JWT token string
 * @returns User ID or null if not found
 */
export function getUserIdFromToken(token: string): string | null {
  const payload = parseJWT(token);
  
  if (!payload) {
    return null;
  }

  return payload.sub || payload.userId || payload.UserId || null;
}

// ═══════════════════════════════════════════════════════════════
// 🆕 SaaS Subscription Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Extract subscription status from JWT token
 * @param token - JWT token string
 * @returns Subscription status ('Active', 'Trial', 'PastDue', 'Cancelled') or 'Trial' as default
 */
export function getSubscriptionStatusFromToken(token: string): string {
  const payload = parseJWT(token);
  
  if (!payload) {
    return 'Trial';
  }

  return payload.SubscriptionStatus || 'Trial';
}

/**
 * Check if user has active subscription based on JWT claims
 * @param token - JWT token string
 * @returns true if subscription is active, false otherwise
 */
export function isSubscriptionActive(token: string): boolean {
  const status = getSubscriptionStatusFromToken(token);
  return status === 'Active';
}

/**
 * Get subscription expiry date from JWT token
 * @param token - JWT token string
 * @returns Date object or null if not found
 */
export function getSubscriptionExpireDate(token: string): Date | null {
  const payload = parseJWT(token);
  
  if (!payload || !payload.SubscriptionExpireDate) {
    return null;
  }

  try {
    return new Date(payload.SubscriptionExpireDate);
  } catch {
    return null;
  }
}

/**
 * Check if subscription requires action (about to expire or inactive)
 * @param token - JWT token string
 * @returns Object with status details
 */
export function getSubscriptionDetails(token: string): {
  status: string;
  isActive: boolean;
  expireDate: Date | null;
  daysRemaining: number | null;
  needsAction: boolean;
} {
  const status = getSubscriptionStatusFromToken(token);
  const expireDate = getSubscriptionExpireDate(token);
  const isActive = status === 'Active';
  
  let daysRemaining: number | null = null;
  let needsAction = !isActive;
  
  if (expireDate && isActive) {
    const now = new Date();
    const diff = expireDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    // Needs action if less than 7 days remaining
    if (daysRemaining <= 7) {
      needsAction = true;
    }
  }
  
  return {
    status,
    isActive,
    expireDate,
    daysRemaining,
    needsAction
  };
}

