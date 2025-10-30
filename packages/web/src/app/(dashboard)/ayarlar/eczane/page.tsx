// app/ayarlar/eczane/page.tsx
import React from 'react';
import SettingsCard from '../../../../components/settings/SettingsCard';
import styles from './eczane.module.css';

const EczaneBilgileriPage = () => {
  return (
    <>
      <h1 className={styles.settingsPageTitle}>Eczane Bilgileri</h1>
      
      <SettingsCard
        title="Genel Eczane Bilgileri"
        description="Sistemde ve profil sayfanızda görünecek olan resmi bilgilerinizi yönetin."
        footer={<button className={`${styles.btn} ${styles.btnPrimary}`}>Bilgileri Kaydet</button>}
      >
        <div className={styles.formGrid}>
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label htmlFor="pharmacyName">Eczane Adı</label>
            <input type="text" id="pharmacyName" defaultValue="Yıldız Eczanesi" />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="licenseNo">Ruhsat Numarası</label>
            <input type="text" id="licenseNo" defaultValue="12345/06" />
          </div>
           <div className={styles.formGroup}>
            <label htmlFor="taxNo">Vergi Numarası</label>
            <input type="text" id="taxNo" defaultValue="9876543210" />
          </div>
           <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label htmlFor="address">Adres</label>
            <textarea id="address" rows={3} defaultValue="Örnek Mah. Atatürk Cad. No: 123/A, Çankaya, Ankara"></textarea>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Eczane Profili Hakkında"
        description="Profil sayfanızda görünecek olan tanıtım yazınızı buradan düzenleyebilirsiniz."
        footer={<button className={`${styles.btn} ${styles.btnPrimary}`}>Hakkında Yazısını Kaydet</button>}
      >
        <div className={styles.formGrid}>
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label htmlFor="about">Hakkında Yazısı</label>
            <textarea 
              id="about" 
              rows={5} 
              defaultValue="Ankara'nın merkezinde 20 yıldır kesintisiz hizmet veren, hasta odaklı ve yenilikçi bir eczaneyiz. İlaç takas sistemi ile meslektaşlarımızla dayanışma içinde olmaktan mutluluk duyuyoruz."
            ></textarea>
          </div>
        </div>
      </SettingsCard>
    </>
  );
};

export default EczaneBilgileriPage;
