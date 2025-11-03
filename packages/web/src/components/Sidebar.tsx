// components/Sidebar.tsx
'use client'; 

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link'; // <Link> import edildi
import styles from './Sidebar.module.css'; 

// --- YENİ: İkon Bileşenleri ---
// (stroke="currentColor" kullanarak CSS'ten rengi almasını sağlıyoruz)
const IlaclarIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="3" width="12" height="18" rx="2" ry="2"></rect><line x1="10" y1="9" x2="14" y2="9"></line><line x1="12" y1="7" x2="12" y2="11"></line></svg>;
const EnvanterIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>;
const TeklifIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>;
const RaporIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20V14"></path></svg>;
const IslemIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>;
const TransferIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>;
const GrupIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
// --- İkonlar Sonu ---

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
      <Link href="/dashboard">
        <img 
          src="/logoBeyaz.png" 
          alt="PharmaDesk Logo" 
          className={styles.sidebarLogo} 
        />
      </Link>
      <nav className={styles.sidebarNav}>
        <ul>
          {/* --- DEĞİŞİKLİK: Linklere ikonlar ve span eklendi --- */}
          <li>
            <Link 
              href="/ilaclar" 
              className={isActive('/ilaclar') ? styles.active : ''}
            >
              <IlaclarIcon /> <span>İLAÇLAR</span>
            </Link>
          </li>
           <li>
            <Link 
              href="/envanterim" 
              className={isActive('/envanterim') ? styles.active : ''}
            >
              <EnvanterIcon /> <span>ENVANTERİM</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/tekliflerim" 
              className={isActive('/tekliflerim') ? styles.active : ''}
            >
              <TeklifIcon /> <span>TEKLİFLERİM</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/raporlar" 
              className={isActive('/raporlar') ? styles.active : ''}
            >
              <RaporIcon /> <span>RAPORLAR</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/islem-gecmisi" 
              className={isActive('/islem-gecmisi') ? styles.active : ''}
            >
              <IslemIcon /> <span>İŞLEM GEÇMİŞİ</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/transferlerim" 
              className={isActive('/transferlerim') ? styles.active : ''}
            >
              <TransferIcon /> <span>TRANSFERLERİM</span>
            </Link>
          </li>
          <li>
            <Link 
              href="/grubum" 
              className={isActive('/grubum') ? styles.active : ''}
            >
              <GrupIcon /> <span>GRUBUM</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default React.memo(Sidebar);