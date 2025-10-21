// components/settings/SettingsSidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './SettingsSidebar.module.css';

const SettingsSidebar = () => {
  const pathname = usePathname();
  const navItems = [
    { href: '/ayarlar/profil', label: 'Profilim' },
    { href: '/ayarlar/eczane', label: 'Eczane Bilgileri' },
    { href: '/ayarlar', label: 'Genel Ayarlar' },
  ];

  return (
    <nav className={styles.settingsSidebar}>
      <ul>
        {navItems.map(item => (
          <li key={item.href}>
            <Link href={item.href} className={pathname === item.href ? styles.active : ''}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SettingsSidebar;