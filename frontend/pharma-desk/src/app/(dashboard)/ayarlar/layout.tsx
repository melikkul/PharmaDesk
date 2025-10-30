// src/app/(dashboard)/ayarlar/layout.tsx
'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

// --- TÜM BİLEŞENLER, STATE'LER VE VERİLER SİLİNDİ ---
// (Sidebar, Header, SlidePanel, pharmacyData, initialNotifications...)
// Bunların hepsi bir üst seviyedeki (dashboard)/layout.tsx'ten geliyor.

// DÜZELTME: dashboard.css yolunu (dashboard) içine al
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './layout.module.css'; // Bu layout'a özel stiller

// Yatay navigasyon menüsü component'i
const SettingsNav = () => {
  const pathname = usePathname();
  const navItems = [
    { href: '/ayarlar/profil', label: 'Profilim' },
    { href: '/ayarlar/eczane', label: 'Eczane Bilgileri' },
    { href: '/ayarlar', label: 'Genel Ayarlar' },
  ];

  // /ayarlar sayfasındayken /ayarlar/genel linkini aktif yap
  const isActive = (href: string) => {
    if (href === '/ayarlar') {
      return pathname === '/ayarlar';
    }
    return pathname.startsWith(href);
  };
  
  // /ayarlar/genel -> /ayarlar olarak düzeltildi
  navItems[2].href = '/ayarlar';

  return (
    <nav className={styles.settingsNav}>
      {navItems.map(item => (
        <Link key={item.href} href={item.href} className={isActive(item.href) ? styles.active : ''}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
};


export default function AyarlarPagesLayout({ children }: { children: React.ReactNode }) {
  // --- TÜM STATE YÖNETİMİ (useState, handleLogout vb.) SİLİNDİ ---

  return (
    // <div className="dashboard-container"> // SİLİNDİ
    //   <Sidebar /> // SİLİNDİ
    //   <Header /> // SİLİNDİ
    //   <main className="main-content"> // SİLİNDİ
        <div className={styles.settingsContainer}>
          <SettingsNav />
          <div className={styles.settingsPageContent}>
            {children}
          </div>
        </div>
    //   </main> // SİLİNDİ
    //   {/* --- Panel ve Modal Alanı SİLİNDİ --- */}
    // </div> // SİLİNDİ
  );
}