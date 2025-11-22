// src/app/(dashboard)/profil/[username]/page.tsx
'use client'

import React, { useCallback } from 'react';
import { useParams } from 'next/navigation';

// Bileşenler
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileDetails from '@/components/profile/ProfileDetails';
import ProfileMedications from '@/components/profile/ProfileMedications';

// Hook'lar
import { useDashboardContext } from '@/context/DashboardContext';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile'; // YENİ HOOK

// Veri (Sadece ilaçlar için statik kalabilir şimdilik)
import { userMedicationsData } from '@/data/dashboardData';

// Stiller
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './profile.module.css';

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const { user } = useAuth();
  
  // YENİ: Hook ile veri çekme
  const { profile, loading, error } = useProfile(params.username);

  const { handleStartChat } = useDashboardContext();

  if (loading) {
    return <div className="p-10 text-center">Profil yükleniyor...</div>;
  }

  if (error || !profile) {
    return <div className="p-10 text-center">Eczane profili bulunamadı.</div>;
  }

  const isOwnProfile = user ? (params.username === user.username || params.username === 'me') : false;

  const handleChatClick = useCallback(() => {
    handleStartChat(profile);
  }, [handleStartChat, profile]);

  return (
    <div className={styles.profileContainer}>
      <ProfileHeader 
        pharmacy={profile} 
        isOwnProfile={isOwnProfile} 
        onStartChat={handleChatClick} 
      />
      <div className={styles.profileBody}>
        <div className={styles.detailsRow}>
          <ProfileDetails pharmacy={profile} isOwnProfile={isOwnProfile} />
        </div>
        {isOwnProfile && (
          <div className={styles.medicationsRow}>
            <ProfileMedications data={userMedicationsData} />
          </div>
        )}
      </div>
    </div>
  );
}