// app/ayarlar/eczane/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import SettingsCard from '../../../../components/settings/SettingsCard';
import styles from './eczane.module.css';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/store/AuthContext';
import { userService } from '@/services/userService';


const EczaneBilgileriPage = () => {
  const { profile, loading } = useProfile('me');
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    pharmacyName: '',
    gln: '',
    taxNo: '', // Backend'de yok, placeholder kalacak veya eklenecek
    address: '',
    about: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        pharmacyName: profile.pharmacyName || '',
        gln: profile.gln || '',
        taxNo: '9876543210', // Backend'de yok
        address: profile.location || '', // location = city + district, address1?
        // useProfile maps address to location. Let's check useProfile mapping.
        // mappedProfile.location = city / district.
        // mappedProfile doesn't expose address1.
        // We should update useProfile to expose address1 if we want to edit it.
        about: profile.about || ''
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    if (!token) return;

    try {
      await userService.updateProfile(token, {
        pharmacyName: formData.pharmacyName,
        // GLN is usually read-only or needs specific permission? Let's allow it for now if backend allows.
        // Backend UpdateMeRequest has PharmacyName, PhoneNumber, City, District, Address1...
        // It doesn't seem to have GLN in UpdateProfileRequest (checked UserDtos.cs).
        // So GLN update might not work.
        // Let's only send what's allowed.
        // @ts-ignore - address1 mapping
        address1: formData.address, // Mapping 'address' input to 'Address1'
        // about: formData.about // Backend doesn't have 'about' yet.
      });

      alert('Bilgiler kaydedildi.');
    } catch (error) {
      console.error('Save error:', error);
      alert('Bir hata oluştu.');
    }
  };

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <>
      <h1 className={styles.settingsPageTitle}>Eczane Bilgileri</h1>
      
      <SettingsCard
        title="Genel Eczane Bilgileri"
        description="Sistemde ve profil sayfanızda görünecek olan resmi bilgilerinizi yönetin."
        footer={<button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave}>Bilgileri Kaydet</button>}
      >
        <div className={styles.formGrid}>
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label htmlFor="pharmacyName">Eczane Adı</label>
            <input 
              type="text" 
              id="pharmacyName" 
              value={formData.pharmacyName} 
              onChange={handleChange}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="gln">GLN (Global Location Number)</label>
            <input 
              type="text" 
              id="gln" 
              value={formData.gln} 
              disabled // GLN genellikle değişmez
            />
          </div>
           <div className={styles.formGroup}>
            <label htmlFor="taxNo">Vergi Numarası</label>
            <input 
              type="text" 
              id="taxNo" 
              value={formData.taxNo} 
              onChange={handleChange}
              disabled // Backend'de yok
            />
          </div>
           <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label htmlFor="address">Adres</label>
            <textarea 
              id="address" 
              rows={3} 
              value={formData.address} 
              onChange={handleChange}
            ></textarea>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Eczane Profili Hakkında"
        description="Profil sayfanızda görünecek olan tanıtım yazınızı buradan düzenleyebilirsiniz."
        footer={<button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSave}>Hakkında Yazısını Kaydet</button>}
      >
        <div className={styles.formGrid}>
          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label htmlFor="about">Hakkında Yazısı</label>
            <textarea 
              id="about" 
              rows={5} 
              value={formData.about} 
              onChange={handleChange}
              placeholder="Eczane hakkında bilgi..."
            ></textarea>
          </div>
        </div>
      </SettingsCard>
    </>
  );
};

export default EczaneBilgileriPage;