// components/settings/SettingsSidebar.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SettingsSidebar = () => {
  const pathname = usePathname();
  const navItems = [
    { href: '/ayarlar/profil', label: 'Profilim' },
    { href: '/ayarlar/eczane', label: 'Eczane Bilgileri' },
    { href: '/ayarlar', label: 'Genel Ayarlar' },
  ];

  return (
    <nav className="settings-sidebar">
      <ul>
        {navItems.map(item => (
          <li key={item.href}>
            <Link href={item.href} className={pathname === item.href ? 'active' : ''}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SettingsSidebar;