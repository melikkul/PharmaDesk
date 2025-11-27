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
      console.error('Invalid JWT format: expected 3 parts');
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
    console.error('Failed to parse JWT:', error);
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
