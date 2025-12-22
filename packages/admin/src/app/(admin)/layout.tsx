'use client';

import React, { useEffect } from 'react';
import styles from './layout.module.css'; // CSS modülünü import et
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import Header from '@/components/Header';

// SuperAdmin-only routes
const SUPERADMIN_ONLY_ROUTES = ['/debug-logs', '/messages', '/admins'];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    } else if (!isLoading && user && user.role !== 'SuperAdmin') {
      // Check if current route is SuperAdmin-only
      const isRestrictedRoute = SUPERADMIN_ONLY_ROUTES.some(route => pathname.startsWith(route));
      if (isRestrictedRoute) {
        router.replace('/forbidden');
      }
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        Yükleniyor...
      </div>
    );
  }
  
  return (
    <div className={styles.adminContainer}>
      <AdminSidebar onLogout={logout} /> 
      <div className={styles.mainContent}>
        <Header userName={user?.name || 'Admin'} onLogout={logout} />
        <main className={styles.pageContent}>{children}</main>
      </div>
    </div>
  );
}