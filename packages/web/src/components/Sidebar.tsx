'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './Sidebar.module.css';

// İkonlar
const DashboardIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const UsersIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;

const Sidebar = () => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (!pathname) return false;
    return pathname.startsWith(path);
  };

  return (
    <aside className={styles.sidebar}>
      <Link href="/dashboard">
        <img
          src="/logoBeyaz.png" // Logonuzun public klasöründe olduğundan emin olun
          alt="PharmaDesk Admin"
          className={styles.sidebarLogo}
        />
      </Link>
      <nav className={styles.sidebarNav}>
        <ul>
          <li>
            <Link
              href="/dashboard"
              className={isActive('/dashboard') ? styles.active : ''}
            >
              <DashboardIcon /> <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link
              href="/users"
              className={isActive('/users') ? styles.active : ''}
            >
              <UsersIcon /> <span>Kullanıcılar</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default React.memo(Sidebar);