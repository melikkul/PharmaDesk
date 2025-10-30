// components/profile/ProfileHeader.tsx
import React from 'react';
import styles from './ProfileHeader.module.css';
import { PharmacyProfileData } from '../../data/dashboardData';
import Link from 'next/link';

interface ProfileHeaderProps {
  pharmacy: PharmacyProfileData;
  isOwnProfile: boolean;
  onStartChat: () => void; // YENİ: Mesaj başlatma fonksiyonu
}

const EditIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
// YENİ: Mesaj ikonu eklendi
const MessageIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ pharmacy, isOwnProfile, onStartChat }) => {
  return (
    <div className={styles.profileHeader}>
      <div className={styles.coverPhoto} style={{ backgroundImage: `url(${pharmacy.coverImageUrl || '/default-cover.jpg'})` }}></div>
      <div className={styles.headerContent}>
        <div className={styles.avatarContainer}>
          <div className={styles.avatar} style={{ backgroundImage: `url(${pharmacy.logoUrl || ''})` }}>
            {!pharmacy.logoUrl && <span>{pharmacy.pharmacyName.charAt(0)}</span>}
          </div>
        </div>
        <div className={styles.userInfo}>
          <h1>{pharmacy.pharmacyName}</h1>
          <p>Sorumlu Eczacı: {pharmacy.pharmacistInCharge}</p>
        </div>
        
        {/* GÜNCELLENDİ: Kendi profili ise "Düzenle", değilse "Mesaj Gönder" butonu */}
        {isOwnProfile ? (
          <Link href="/ayarlar/eczane" className={styles.editProfileButton}>
            <EditIcon />
            <span>Eczane Profilini Düzenle</span>
          </Link>
        ) : (
          <button className={styles.editProfileButton} onClick={onStartChat}>
            <MessageIcon />
            <span>Mesaj Gönder</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;