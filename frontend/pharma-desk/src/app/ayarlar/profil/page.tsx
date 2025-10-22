// app/ayarlar/profil/page.tsx
import React from 'react';
import SettingsCard from '../../../components/settings/SettingsCard';
import styles from './profil.module.css';

const ProfilimPage = () => {
  return (
    // Bu sayfanın etrafında <SettingsLayout> olmamalıdır.
    <>
      <h1 className={styles.settingsPageTitle}>Profilim</h1>
      <SettingsCard
        title="Kişisel Bilgiler"
        description="Temel profil bilgilerinizi buradan güncelleyebilirsiniz."
        footer={<button className={`${styles.btn} ${styles.btnPrimary}`}>Değişiklikleri Kaydet</button>}
      >
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="fullName">Ad Soyad</label>
            <input type="text" id="fullName" defaultValue="Zeynep Yılmaz" />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="email">E-posta Adresi</label>
            <input type="email" id="email" defaultValue="zeynep.yilmaz@email.com" />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Şifre Değiştir"
        description="Güvenliğiniz için belirli aralıklarla şifrenizi değiştirmeniz önerilir."
        footer={<button className={`${styles.btn} ${styles.btnPrimary}`}>Şifreyi Güncelle</button>}
      >
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="currentPassword">Mevcut Şifre</label>
            <input type="password" id="currentPassword" />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="newPassword">Yeni Şifre</label>
            <input type="password" id="newPassword" />
          </div>
           <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</label>
            <input type="password" id="confirmPassword" />
          </div>
        </div>
      </SettingsCard>
    </>
  );
};

export default ProfilimPage;