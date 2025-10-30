// components/Sidebar.tsx
'use client'; 

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link'; // <Link> import edildi
import styles from './Sidebar.module.css'; 

const Sidebar = () => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === '/dashboard') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  return (
    <aside className={styles.sidebar}>
      {/* <a>, <Link> olarak değiştirildi */}
      <Link href="/dashboard">
        <img 
          src="/logoBeyaz.png" 
          alt="PharmaDesk Logo" 
          className={styles.sidebarLogo} 
        />
      </Link>
      <nav className={styles.sidebarNav}>
        <ul>
          {/* Tüm <a> etiketleri <Link> olarak değiştirildi */}
          <li>
            <Link 
              href="/ilaclar" 
              className={isActive('/ilaclar') ? styles.active : ''}
            >
              İLAÇLAR
            </Link>
          </li>
          <li>
            <Link 
              href="/tekliflerim" 
              className={isActive('/tekliflerim') ? styles.active : ''}
            >
              TEKLİFLERİM
            </Link>
          </li>
          <li>
            <Link 
              href="/raporlar" 
              className={isActive('/raporlar') ? styles.active : ''}
            >
              RAPORLAR
            </Link>
          </li>
          <li>
            <Link 
              href="/islem-gecmisi" 
              className={isActive('/islem-gecmisi') ? styles.active : ''}
            >
              İŞLEM GEÇMİŞİ
            </Link>
          </li>
          <li>
            <Link 
              href="/transferlerim" 
              className={isActive('/transferlerim') ? styles.active : ''}
            >
              TRANSFERLERİM
            </Link>
          </li>
          <li>
            <Link 
              href="/grubum" 
              className={isActive('/grubum') ? styles.active : ''}
            >
              GRUBUM
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;