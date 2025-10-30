'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import styles from './adminLayout.module.css';

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
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        Yükleniyor...
      </div>
    );
  }
  
  // Login sayfasındaysa layout'u gösterme (her ihtimale karşı)
  if (pathname === '/login') {
    return children;
  }

  return (
    <div className={styles.adminContainer}>
      <AdminSidebar onLogout={logout} />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}