// src/app/(dashboard)/ayarlar/layout.tsx
'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

// --- TÜM BİLEŞENLER, STATE'LER VE VERİLER SİLİNDİ ---

import styles from './layout.module.css'; // Bu layout'a özel stiller

// Yatay navigasyon menüsü component'i
const SettingsNav = () => {
  const pathname = usePathname();
  const navItems = [
    { href: '/ayarlar/profil', label: 'Profilim' },
    { href: '/ayarlar/eczane', label: 'Eczane Bilgileri' },
    { href: '/ayarlar', label: 'Genel Ayarlar' },
  ];
  
  const isActive = (href: string) => {
    // /ayarlar/profil -> /ayarlar/profil ile eşleşir
    // /ayarlar -> sadece /ayarlar ile eşleşir
    return pathname === href;
  };

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
  return (
    <div className={styles.settingsContainer}>
      <SettingsNav />
      <div className={styles.settingsPageContent}>
        {children}
      </div>
    </div>
  );
}