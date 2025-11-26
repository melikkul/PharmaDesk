// src/app/(dashboard)/profile/[id]/page.tsx
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import { useDashboardContext } from '@/store/DashboardContext';
import { useProfile } from '@/hooks/useProfile';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileDetails from '@/components/profile/ProfileDetails';
import styles from './profile.module.css';

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  
  // CRITICAL: All hooks must be called BEFORE any conditional returns
  // This fixes "React has detected a change in the order of Hooks" error
  const { handleStartChat } = useDashboardContext();
  const { profile, loading, error } = useProfile(params.id);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Yükleniyor...</div>;
  }

  if (error || !profile) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>Profil bulunamadı veya bir hata oluştu.</div>;
  }

  // Check if viewing own profile
  // IMPORTANT: Compare profile.id (from backend) with user.pharmacyId
  // This prevents showing "Edit Profile" for different pharmacies with same name
  const isOwnProfile = user && profile ? (
    params.id === 'me' || 
    profile.id === user.pharmacyId?.toString() ||
    profile.id === user.id?.toString()
  ) : false;

  const onStartChat = () => {
    console.log('[ProfilePage] onStartChat called!');
    console.log('[ProfilePage] profile:', profile);
    console.log('[ProfilePage] handleStartChat:', handleStartChat);
    if (profile) {
      handleStartChat(profile);
    }
  };

  return (
    <div className={styles.profileContainer}>
      <ProfileHeader 
        pharmacy={profile} 
        isOwnProfile={isOwnProfile}
        onStartChat={onStartChat}
      />
      
      <div className={styles.detailsGrid}>
        <ProfileDetails 
          pharmacy={profile} 
          isOwnProfile={isOwnProfile}
        />
      </div>
    </div>
  );
}