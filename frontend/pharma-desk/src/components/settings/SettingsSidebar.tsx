// components/settings/SettingsSidebar.tsx
'use client';

import React from 'react';
import styles from './SettingsSidebar.module.css';

interface SettingsSidebarProps {
  onLinkClick: (section: 'profil' | 'eczane' | 'genel') => void;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ onLinkClick }) => {
  const navItems = [
    { id: 'profil', label: 'Profilim' },
    { id: 'eczane', label: 'Eczane Bilgileri' },
    { id: 'genel', label: 'Genel Ayarlar' },
  ];

  return (
    <nav className={styles.settingsSidebar}>
      <ul>
        {navItems.map(item => (
          <li key={item.id}>
            <a onClick={() => onLinkClick(item.id as 'profil' | 'eczane' | 'genel')} className={styles.active}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SettingsSidebar;