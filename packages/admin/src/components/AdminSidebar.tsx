'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminSidebar.module.css';
import { useAuth } from '@/context/AuthContext';

interface AdminSidebarProps {
  onLogout: () => void;
}

interface NavItem {
  href: string;
  label: string;
  superAdminOnly?: boolean;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ onLogout }) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SuperAdmin';

  const isActive = (path: string) => {
     if (path === '/dashboard') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  }

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/users', label: 'Eczaneler' },
    { href: '/messages', label: '💬 Sohbet İzleme', superAdminOnly: true },
    { href: '/offers', label: 'Tüm Teklifler' },
    { href: '/transactions', label: 'Tüm İşlemler' },
    { href: '/drugs', label: 'Ana İlaç Listesi' },
    { href: '/groups', label: 'Grup Yönetimi' },
    { href: '/cargo', label: 'Kargo Yönetimi' },
    { href: '/debug-logs', label: '🔍 Debug Logs', superAdminOnly: true },
    { href: '/admins', label: '👥 Yöneticiler', superAdminOnly: true },
  ];

  // Filter items based on role
  const filteredItems = navItems.filter(item => !item.superAdminOnly || isSuperAdmin);

  return (
    <aside className={styles.sidebar}>
      <img src="/logoBeyaz.png" alt="PharmaDesk Logo" className={styles.sidebarLogo} />
      <nav className={styles.sidebarNav}>
        <ul>
          {filteredItems.map(item => (
            <li key={item.href}>
              <Link href={item.href} className={isActive(item.href) ? styles.active : ''}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className={styles.sidebarFooter}>
        <button onClick={onLogout} className={styles.logoutButton}>
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;