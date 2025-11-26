// app/ayarlar/profil/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import SettingsCard from '../../../../components/settings/SettingsCard';
import styles from './profil.module.css';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/store/AuthContext';
import { userService } from '@/services/userService';


const ProfilimPage = () => {
  const { profile, loading } = useProfile('me');
  const { user, token } = useAuth();
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (profile) {
      setBio(profile.about || '');
    }
  }, [profile]);

  const handleBioSave = async () => {
    if (!token) return;

    try {
      // @ts-ignore - about field might not exist in backend DTO yet
      await userService.updateProfile(token, {
        about: bio
      });

      alert('Biyografi kaydedildi.');
    } catch (error) {
      console.error('Save error:', error);
      alert('Bir hata oluştu.');
    }
  };

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <>
      <h1 className={styles.settingsPageTitle}>Profilim</h1>
      
      {/* Kişisel Bilgiler Kartı */}
      <SettingsCard
        title="Kişisel Bilgiler"
        description="Temel profil bilgilerinizi buradan görüntüleyebilirsiniz. (Değişiklik için yönetici ile iletişime geçin)"
        // footer={<button className={`${styles.btn} ${styles.btnPrimary}`}>Değişiklikleri Kaydet</button>}
      >
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="fullName">Ad Soyad</label>
            <input 
              type="text" 
              id="fullName" 
              defaultValue={user?.fullName || ''} 
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="email">E-posta Adresi</label>
            <input 
              type="email" 
              id="email" 
              defaultValue={user?.email || profile?.username || ''} 
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
          </div>
        </div>
      </SettingsCard>

      {/* YENİ: Hakkında Yazısı Düzenleme Kartı */}
      <SettingsCard
        title="Hakkında Yazısı"
        description="Profil sayfanızda görünecek olan biyografinizi buradan düzenleyebilirsiniz."
        footer={<button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleBioSave}>Biyografiyi Kaydet</button>}
      >
        <div className={styles.formGrid}>
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label htmlFor="bio">Biyografi</label>
            <textarea 
              id="bio" 
              rows={5} 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Kendinizden bahsedin..."
            ></textarea>
          </div>
        </div>
      </SettingsCard>

      {/* Şifre Değiştirme Kartı */}
      <SettingsCard
        title="Şifre Değiştir"
        description="Güvenliğiniz için belirli aralıklarla şifrenizi değiştirmeniz önerilir."
        footer={<button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => alert('Şifre değiştirme henüz aktif değil.')}>Şifreyi Güncelle</button>}
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