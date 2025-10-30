// src/app/(dashboard)/profil/[username]/page.tsx
'use client'

import React from 'react';
import { useParams } from 'next/navigation';

// Veri ve Bileşenleri import ediyoruz
import { pharmacyData, otherPharmaciesData, userMedicationsData, PharmacyProfileData } from '@/data/dashboardData';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileDetails from '@/components/profile/ProfileDetails';
import ProfileMedications from '@/components/profile/ProfileMedications';

// GÜNCELLEME: Layout'taki hook'u import et
import { useDashboard } from '@/hooks/useDashboardPanels';

// Stil dosyalarını import ediyoruz
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './profile.module.css';

const getPharmacyData = (username: string | string[]) => {
  const allPharmacies = [pharmacyData, ...otherPharmaciesData];
  return allPharmacies.find(p => p.username === username) || null;
};

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const pharmacy = getPharmacyData(params.username);

  // 1. ADIM: Context'ten (layout'tan) gelen fonksiyonu al
  const { handleStartChat } = useDashboard();

  // --- Tüm local state'ler ve handler'lar SİLİNDİ ---

  if (!pharmacy) {
    return <div><p>Eczane profili bulunamadı.</p></div>;
  }

  const isOwnProfile = params.username === pharmacyData.username;

  return (
    <div className={styles.profileContainer}>
      {/* 2. ADIM: Context'teki fonksiyonu butona bağla */}
      <ProfileHeader 
        pharmacy={pharmacy} 
        isOwnProfile={isOwnProfile} 
        onStartChat={() => handleStartChat(pharmacy)} // pharmacy verisini fonksiyona yolla
      />
      <div className={styles.profileBody}>
        <div className={styles.detailsRow}>
          <ProfileDetails pharmacy={pharmacy} isOwnProfile={isOwnProfile} />
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