// app/ayarlar/eczane/page.tsx
import React from 'react';
import SettingsCard from '../../../components/settings/SettingsCard';
import styles from './eczane.module.css';

const EczaneBilgileriPage = () => {
  return (
    // Bu sayfanın etrafında <SettingsLayout> olmamalıdır.
    <>
      <h1 className={styles.settingsPageTitle}>Eczane Bilgileri</h1>
      <SettingsCard
        title="Genel Eczane Bilgileri"
        description="Sistemde görünecek olan resmi eczane bilgilerinizi yönetin."
        footer={<button className={`${styles.btn} ${styles.btnPrimary}`}>Bilgileri Kaydet</button>}
      >
        <div className={styles.formGrid}>
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label htmlFor="pharmacyName">Eczane Adı</label>
            <input type="text" id="pharmacyName" defaultValue="Yıldız Eczanesi" />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="licenseNo">Ruhsat Numarası</label>
            <input type="text" id="licenseNo" defaultValue="123456789" />
          </div>
           <div className={styles.formGroup}>
            <label htmlFor="taxNo">Vergi Numarası</label>
            <input type="text" id="taxNo" defaultValue="9876543210" />
          </div>
           <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label htmlFor="address">Adres</label>
            <textarea id="address" rows={3} defaultValue="Örnek Mah. Atatürk Cad. No: 123/A"></textarea>
          </div>
           <div className={styles.formGroup}>
            <label htmlFor="city">Şehir</label>
            <input type="text" id="city" defaultValue="Ankara" />
          </div>
           <div className={styles.formGroup}>
            <label htmlFor="district">İlçe</label>
            <input type="text" id="district" defaultValue="Çankaya" />
          </div>
        </div>
      </SettingsCard>
    </>
  );
};

export default EczaneBilgileriPage;