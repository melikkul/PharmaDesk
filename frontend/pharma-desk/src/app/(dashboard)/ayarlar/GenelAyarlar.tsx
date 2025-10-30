// src/app/ayarlar/GenelAyarlar.tsx
import React from 'react';
import SettingsCard from '../../../components/settings/SettingsCard';
import styles from './page.module.css';

const GenelAyarlarPage = () => {
  return (
    <>
      <h1 className={styles.settingsPageTitle}>Genel Ayarlar</h1>
      <SettingsCard
        title="Bildirim Tercihleri"
        description="Hangi durumlarda bildirim almak istediğinizi seçin."
      >
        <div className={styles.toggleList}>
          <div className={styles.toggleItem}>
            <span>Yeni teklifler için e-posta gönder</span>
            <label className={styles.switch}>
              <input type="checkbox" defaultChecked />
              <span className={`${styles.slider} ${styles.round}`}></span>
            </label>
          </div>
          <div className={styles.toggleItem}>
            <span>Kargo durum güncellemeleri için e-posta gönder</span>
            <label className={styles.switch}>
              <input type="checkbox" defaultChecked />
              <span className={`${styles.slider} ${styles.round}`}></span>
            </label>
          </div>
          <div className={styles.toggleItem}>
            <span>Sistem ve kampanya duyuruları</span>
            <label className={styles.switch}>
              <input type="checkbox" />
              <span className={`${styles.slider} ${styles.round}`}></span>
            </label>
          </div>
        </div>
      </SettingsCard>
      
      <SettingsCard
        title="Hesap İşlemleri"
        description="Bu işlem geri alınamaz. Lütfen dikkatli olun."
      >
         <button className={`${styles.btn} ${styles.btnDanger}`}>Hesabı Kalıcı Olarak Sil</button>
      </SettingsCard>
    </>
  );
};

export default GenelAyarlarPage;