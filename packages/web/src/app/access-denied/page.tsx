'use client';

import React from 'react';
import Link from 'next/link';
import styles from './access-denied.module.css';

export default function AccessDenied() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <span className={styles.icon}>🚫</span>
        <h1 className={styles.title}>Erişim Reddedildi</h1>
        <p className={styles.message}>
          Bu sayfayı görüntülemek için yetkiniz bulunmamaktadır veya oturumunuz sonlanmış olabilir.
        </p>
        <div className={styles.buttonGroup}>
          <Link href="/login" className={`${styles.btn} ${styles.btnLogin}`}>
            Giriş Yap
          </Link>
          <Link href="/anasayfa" className={`${styles.btn} ${styles.btnHome}`}>
            Anasayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
