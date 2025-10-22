// src/app/ayarlar/page.tsx
'use client';
import React, { useRef } from 'react';
import ProfilimPage from './profil/page';
import EczaneBilgileriPage from './eczane/page';
import GenelAyarlarPage from './GenelAyarlar'; // Düzeltilmiş import
import styles from './page.module.css';

const AyarlarPageContainer = () => {
  const profilRef = useRef<HTMLDivElement>(null);
  const eczaneRef = useRef<HTMLDivElement>(null);
  const genelRef = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={styles.settingsContainer}>
      <nav className={styles.settingsNav}>
        <a onClick={() => scrollTo(profilRef)}>Profilim</a>
        <a onClick={() => scrollTo(eczaneRef)}>Eczane Bilgileri</a>
        <a onClick={() => scrollTo(genelRef)}>Genel Ayarlar</a>
      </nav>
      <div className={styles.settingsContent}>
        <div ref={profilRef} className={styles.settingsSection}>
          <ProfilimPage />
        </div>
        <div ref={eczaneRef} className={styles.settingsSection}>
          <EczaneBilgileriPage />
        </div>
        <div ref={genelRef} className={styles.settingsSection}>
          <GenelAyarlarPage />
        </div>
      </div>
    </div>
  );
};

export default AyarlarPageContainer;