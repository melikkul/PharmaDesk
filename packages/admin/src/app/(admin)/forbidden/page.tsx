'use client';

import React from 'react';
import Link from 'next/link';
import styles from './forbidden.module.css';

// Lock/Shield SVG Icon Component
const ShieldLockIcon = () => (
  <svg 
    className={styles.icon}
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5"
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <rect x="9" y="9" width="6" height="7" rx="1"/>
    <path d="M10 9V7a2 2 0 0 1 4 0v2"/>
  </svg>
);

export default function ForbiddenPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Animated Glow Effect */}
        <div className={styles.glowEffect}></div>
        
        {/* Shield Icon */}
        <div className={styles.iconContainer}>
          <ShieldLockIcon />
        </div>
        
        {/* Error Code */}
        <div className={styles.errorCode}>403</div>
        
        {/* Title */}
        <h1 className={styles.title}>Erişim Reddedildi</h1>
        
        {/* Description */}
        <p className={styles.description}>
          Bu sayfayı görüntülemek için yetkiniz bulunmamaktadır.
          <br />
          <span className={styles.hint}>
            Bu alan yalnızca <strong>SuperAdmin</strong> yetkisine sahip kullanıcılar içindir.
          </span>
        </p>
        
        {/* Divider */}
        <div className={styles.divider}></div>
        
        {/* Action Button */}
        <Link href="/dashboard" className={styles.button}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
          Ana Sayfaya Dön
        </Link>
        
        {/* Help Text */}
        <p className={styles.helpText}>
          Bu bir hata olduğunu düşünüyorsanız, sistem yöneticinize başvurun.
        </p>
      </div>
    </div>
  );
}
