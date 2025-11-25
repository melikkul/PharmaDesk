// components/profile/ProfileHeader.tsx
import React from 'react';
import styles from './ProfileHeader.module.css';
import { PharmacyProfileData } from '../../data/dashboardData';
import Link from 'next/link';

interface ProfileHeaderProps {
  pharmacy: PharmacyProfileData;
  isOwnProfile: boolean;
  onStartChat?: () => void;
}

const EditIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const MessageIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ pharmacy, isOwnProfile, onStartChat }) => {
  // Get first letter for avatar fallback
  const avatarLetter = pharmacy.pharmacyName?.charAt(0).toUpperCase() || '?';
  
  return (
    <div className={styles.profileHeader}>
      {/* Cover Photo */}
      <div 
        className={styles.coverPhoto}
        style={{
          backgroundImage: pharmacy.coverImageUrl ? `url(${pharmacy.coverImageUrl})` : 'none'
        }}
      />
      
      {/* Header Content */}
      <div className={styles.headerContent}>
        {/* Avatar */}
        <div className={styles.avatarContainer}>
          <div 
            className={styles.avatar}
            style={{
              backgroundImage: pharmacy.logoUrl ? `url(${pharmacy.logoUrl})` : 'none',
              backgroundColor: pharmacy.logoUrl ? 'transparent' : '#6c757d'
            }}
          >
            {!pharmacy.logoUrl && avatarLetter}
          </div>
        </div>
        
        {/* User Info */}
        <div className={styles.userInfo}>
          <h1>{pharmacy.pharmacyName || 'Eczane İsmi Yok'}</h1>
          <p>{pharmacy.pharmacistInCharge || 'Eczacı Bilgisi Yok'}</p>
        </div>
        
        {/* Action Buttons */}
        {isOwnProfile ? (
          <Link href="/ayarlar/eczane" className={styles.editProfileButton}>
            <EditIcon />
            Profili Düzenle
          </Link>
        ) : (
          <button 
            type="button"
            className={styles.editProfileButton}
            onClick={() => {
              console.log('[ProfileHeader] Button clicked!');
              console.log('[ProfileHeader] onStartChat prop:', onStartChat);
              if (onStartChat) {
                onStartChat();
              } else {
                console.error('[ProfileHeader] onStartChat is undefined!');
              }
            }}
            style={{
              backgroundColor: '#0d6efd',
              color: 'white',
              borderColor: '#0d6efd'
            }}
          >
            <MessageIcon />
            Mesaj Gönder
          </button>
        )}
      </div>
    </div>
  );
};

export default React.memo(ProfileHeader);