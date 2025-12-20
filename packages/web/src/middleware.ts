import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRoleFromToken, isTokenExpired, isSubscriptionActive, getSubscriptionStatusFromToken } from './lib/jwt';

export function middleware(request: NextRequest) {
  // Check for both access token and refresh token cookies
  const token = request.cookies.get('token')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const { pathname } = request.nextUrl;

  // Public routes: Accessible to all
  const publicRoutes = ['/anasayfa', '/sifremi-unuttum', '/reset-password', '/access-denied'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  // Auth routes: Login/Register - redirect authenticated users to dashboard
  const authRoutes = ['/login', '/register'];
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // Admin routes: Require Admin role
  const adminRoutes = ['/admin'];
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

  // ═══════════════════════════════════════════════════════════════
  // 🆕 SaaS Subscription Routing
  // ═══════════════════════════════════════════════════════════════
  
  // Free routes: Accessible to authenticated users WITHOUT active subscription
  // Users can access these even if subscription is expired/trial
  const freeRoutes = [
    '/dashboard',     // Dashboard (with warning banner)
    '/abonelik',      // Subscription page (to pay)
    '/profil',        // Profile settings
    '/ayarlar',       // General settings
    '/grubum',        // Group info (read-only)
    '/access-denied', // Error pages
  ];
  const isFreeRoute = freeRoutes.some(route => pathname.startsWith(route));

  // Subscription required routes: Require ACTIVE subscription
  // These are the operational/transactional features
  const subscriptionRequiredRoutes = [
    '/envanterim',      // Inventory management
    '/ilaclar',         // Medication search
    '/tekliflerim',     // My offers
    '/transferlerim',   // Transfers
    '/siparisler',      // Orders
    '/islem-gecmisi',   // Transaction history
    '/raporlar',        // Reports
    '/sepet',           // Shopping cart
    '/teklif',          // Create offer
    '/rbac-demo',       // Demo page
  ];
  const isSubscriptionRequiredRoute = subscriptionRequiredRoutes.some(route => pathname.startsWith(route));

  // Protected routes: Require any authenticated user
  const protectedRoutes = [
    ...freeRoutes,
    ...subscriptionRequiredRoutes,
  ];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Check if user has valid session
  // Access token valid OR refresh token present (frontend will auto-refresh access token)
  const hasValidToken = (token && !isTokenExpired(token)) || !!refreshToken;

  // 1. PUBLIC ROUTES: Accessible to all (no redirect)
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // 2. AUTH ROUTES (login/register): Redirect authenticated users to dashboard
  if (isAuthRoute) {
    if (hasValidToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // 3. PROTECTED/ADMIN ROUTES: Require authentication
  if (!hasValidToken && (isProtectedRoute || isAdminRoute)) {
    // If trying to access dashboard directly without auth, show access denied error
    if (pathname === '/dashboard') {
        return NextResponse.redirect(new URL('/access-denied', request.url));
    }

    // No token or expired - redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname); // Remember where they wanted to go
    return NextResponse.redirect(loginUrl);
  }

  // 4. ADMIN ROUTES: Check role
  if (isAdminRoute && hasValidToken && token) {
    const role = getRoleFromToken(token);
    
    if (role !== 'Admin') {
      // Not an admin - redirect to dashboard with error
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🆕 5. SUBSCRIPTION CHECK: For routes that require active subscription
  // ═══════════════════════════════════════════════════════════════
  if (isSubscriptionRequiredRoute && hasValidToken && token) {
    const role = getRoleFromToken(token);
    
    // Admins bypass subscription check
    if (role === 'Admin') {
      return NextResponse.next();
    }
    
    // Check subscription status from JWT claims
    const hasActiveSubscription = isSubscriptionActive(token);
    const subStatus = getSubscriptionStatusFromToken(token);
    
    console.log(`[Middleware] Path: ${pathname}, Role: ${role}, SubStatus: ${subStatus}, IsActive: ${hasActiveSubscription}`);
    
    
    if (!hasActiveSubscription) {
      // No active subscription - redirect to subscription page
      const abonelikUrl = new URL('/abonelik', request.url);
      abonelikUrl.searchParams.set('redirect', pathname);
      abonelikUrl.searchParams.set('reason', 'subscription_required');
      return NextResponse.redirect(abonelikUrl);
    }
  }

  // 6. CATCH-ALL: Any route not explicitly public requires authentication
  // This ensures /dashboard and other protected routes redirect to login
  if (!hasValidToken && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 7. All checks passed - allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, fonts, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next/data).*)',
  ],
};
