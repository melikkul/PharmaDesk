// components/Sidebar.tsx
'use client'; // Dinamik hook (usePathname) kullanmak için bu satır eklendi.

import React from 'react';
import { usePathname } from 'next/navigation'; // Mevcut URL'i almak için import eklendi
import styles from './Sidebar.module.css'; 

const Sidebar = () => {
  // Mevcut sayfanın URL yolunu (pathname) al
  const pathname = usePathname();

  /**
   * Bu fonksiyon, verilen 'path'in mevcut URL yolu (pathname) ile 
   * eşleşip eşleşmediğini kontrol eder.
   * Örneğin, mevcut sayfa '/tekliflerim/yeni' ise, 
   * '/tekliflerim' linki 'active' olarak işaretlenir.
   */
  const isActive = (path: string) => {
    if (!pathname) return false;
    
    // Ana sayfa (logo linki) için tam eşleşme kontrolü
    if (path === '/dashboard') {
      return pathname === path;
    }
    
    // Diğer tüm linkler için "bu yolla başlıyor mu?" kontrolü
    // (örn: /raporlar/miad sayfası, /raporlar linkini aktif yapar)
    return pathname.startsWith(path);
  };

  return (
    <aside className={styles.sidebar}>
      {/* Logo linkine de aktif durum eklendi. 
        Not: .active stilinin logoya uygulanması için CSS'te ek stil gerekebilir,
        ancak menü butonları için mevcut .active stili kullanılacaktır.
      */}
      <a href="/dashboard">
        <img 
          src="/logoBeyaz.png" 
          alt="PharmaDesk Logo" 
          className={styles.sidebarLogo} 
        />
      </a>
      <nav className={styles.sidebarNav}>
        <ul>
          {/* Tüm menü linkleri (<a> tag'leri) güncellendi:
            Mevcut sayfa (pathname) bu linkin yoluyla (href) başlıyorsa,
            'styles.active' sınıfı dinamik olarak eklenir.
          */}
          <li>
            <a 
              href="/ilaclar" 
              className={isActive('/ilaclar') ? styles.active : ''}
            >
              İLAÇLAR
            </a>
          </li>
          <li>
            <a 
              href="/tekliflerim" 
              className={isActive('/tekliflerim') ? styles.active : ''}
            >
              TEKLİFLERİM
            </a>
          </li>
          <li>
            <a 
              href="/raporlar" 
              className={isActive('/raporlar') ? styles.active : ''}
            >
              RAPORLAR
            </a>
          </li>
          <li>
            <a 
              href="/islem-gecmisi" 
              className={isActive('/islem-gecmisi') ? styles.active : ''}
            >
              İŞLEM GEÇMİŞİ
            </a>
          </li>
          <li>
            <a 
              href="/transferlerim" 
              className={isActive('/transferlerim') ? styles.active : ''}
            >
              TRANSFERLERİM
            </a>
          </li>
          <li>
            <a 
              href="/grubum" 
              className={isActive('/grubum') ? styles.active : ''}
            >
              GRUBUM
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;