'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './Sidebar.module.css';

// İkonlar
const DashboardIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const UsersIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const HistoryIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"></path><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path><path d="M12 7v5l4 2"></path></svg>;

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (!pathname) return false;
    return pathname.startsWith(path);
  };

  const handleLinkClick = () => {
    // Close sidebar on mobile when link is clicked
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && <div className={styles.overlay} onClick={onClose} />}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <Link href="/dashboard" onClick={handleLinkClick}>
          <img
            src="/logoBeyaz.png"
            alt="PharmaDesk"
            className={styles.sidebarLogo}
          />
        </Link>
        <nav className={styles.sidebarNav}>
          <ul>
            <li>
              <Link
                href="/dashboard"
                className={isActive('/dashboard') ? styles.active : ''}
                onClick={handleLinkClick}
              >
                <DashboardIcon /> <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link
                href="/envanterim"
                className={isActive('/envanterim') ? styles.active : ''}
                onClick={handleLinkClick}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                <span>Envanterim</span>
              </Link>
            </li>
            <li>
              <Link
                href="/ilaclar"
                className={isActive('/ilaclar') ? styles.active : ''}
                onClick={handleLinkClick}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                <span>İlaç Vitrini</span>
              </Link>
            </li>
            <li>
              <Link
                href="/tekliflerim"
                className={isActive('/tekliflerim') ? styles.active : ''}
                onClick={handleLinkClick}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                <span>Teklifler</span>
              </Link>
            </li>
            <li>
              <Link
                href="/transferlerim"
                className={isActive('/transferlerim') ? styles.active : ''}
                onClick={handleLinkClick}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
                <span>Transferler</span>
              </Link>
            </li>
            <li>
              <Link
                href="/islem-gecmisi"
                className={isActive('/islem-gecmisi') ? styles.active : ''}
                onClick={handleLinkClick}
              >
                <HistoryIcon /> <span>İşlem Geçmişi</span>
              </Link>
            </li>
            <li>
              <Link
                href="/siparisler"
                className={isActive('/siparisler') ? styles.active : ''}
                onClick={handleLinkClick}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                <span>Siparişlerim</span>
              </Link>
            </li>
            <li>
              <Link
                href="/grubum"
                className={isActive('/grubum') ? styles.active : ''}
                onClick={handleLinkClick}
              >
                <UsersIcon /> <span>Grubum</span>
              </Link>
            </li>
            <li>
              <Link
                href="/raporlar"
                className={isActive('/raporlar') ? styles.active : ''}
                onClick={handleLinkClick}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                <span>Raporlar</span>
              </Link>
            </li>
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default React.memo(Sidebar);