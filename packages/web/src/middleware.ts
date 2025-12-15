import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRoleFromToken, isTokenExpired } from './lib/jwt';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
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

  // Protected routes: Require any authenticated user
  // Note: (dashboard) is a route group in Next.js - it's NOT part of the URL
  // So routes are /envanterim, /ilaclar, etc. NOT /dashboard/envanterim
  const protectedRoutes = [
    '/dashboard',
    '/envanterim',
    '/ilaclar',
    '/tekliflerim',
    '/transferlerim',
    '/siparisler',
    '/islem-gecmisi',
    '/grubum',
    '/raporlar',
    '/profil',
    '/ayarlar',
    '/sepet',
    '/teklif',
    '/rbac-demo'
  ];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Check if user has valid token
  const hasValidToken = token && !isTokenExpired(token);

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

  // 2. PROTECTED/ADMIN ROUTES: Require authentication
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

  // 3. ADMIN ROUTES: Check role
  if (isAdminRoute && hasValidToken) {
    const role = getRoleFromToken(token);
    
    if (role !== 'Admin') {
      // Not an admin - redirect to dashboard with error
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // 4. CATCH-ALL: Any route not explicitly public requires authentication
  // This ensures /dashboard and other protected routes redirect to login
  if (!hasValidToken && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. All checks passed - allow access
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
