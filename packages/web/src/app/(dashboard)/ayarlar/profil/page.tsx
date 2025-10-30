// app/ayarlar/profil/page.tsx
import React from 'react';
import SettingsCard from '../../../../components/settings/SettingsCard';
import styles from './profil.module.css';

const ProfilimPage = () => {
  return (
    <>
      <h1 className={styles.settingsPageTitle}>Profilim</h1>
      
      {/* Kişisel Bilgiler Kartı */}
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

      {/* YENİ: Hakkında Yazısı Düzenleme Kartı */}
      <SettingsCard
        title="Hakkında Yazısı"
        description="Profil sayfanızda görünecek olan biyografinizi buradan düzenleyebilirsiniz."
        footer={<button className={`${styles.btn} ${styles.btnPrimary}`}>Biyografiyi Kaydet</button>}
      >
        <div className={styles.formGrid}>
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label htmlFor="bio">Biyografi</label>
            <textarea 
              id="bio" 
              rows={5} 
              defaultValue="Sağlık ve teknoloji tutkunu bir eczacı. İlaç takas sisteminin eczaneler arası iletişimi güçlendirdiğine inanıyorum."
            ></textarea>
          </div>
        </div>
      </SettingsCard>

      {/* Şifre Değiştirme Kartı */}
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