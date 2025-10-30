'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminSidebar.module.css';

interface AdminSidebarProps {
  onLogout: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ onLogout }) => {
  const pathname = usePathname();
  const isActive = (path: string) => {
     if (path === '/dashboard') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/pharmacies', label: 'Eczaneler' },
    { href: '/offers', label: 'Tüm Teklifler' },
    { href: '/transactions', label: 'Tüm İşlemler' },
    { href: '/drugs', label: 'Ana İlaç Listesi' },
    { href: '/groups', label: 'Grup Yönetimi' },
  ];

  return (
    <aside className={styles.sidebar}>
      <img src="/logoBeyaz.png" alt="PharmaDesk Logo" className={styles.sidebarLogo} />
      <nav className={styles.sidebarNav}>
        <ul>
          {navItems.map(item => (
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