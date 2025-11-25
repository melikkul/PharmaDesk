// src/app/grubum/PharmacyCard.tsx
import React from 'react';
import Link from 'next/link';
import { PharmacyProfileData } from '@/data/dashboardData';
import styles from './grubum.module.css'; // Grubum sayfasının stillerini kullanacağız

// İkonlar
const ProfileIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const MessageIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;
const LocationIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const UserIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;


interface PharmacyCardProps {
  pharmacy: PharmacyProfileData;
}

const PharmacyCard: React.FC<PharmacyCardProps> = ({ pharmacy }) => {
  return (
    <div className={styles.pharmacyCard}>
      <div className={styles.cardHeader}>
        <div className={styles.avatar}>
           {pharmacy.logoUrl ? (
             <img src={pharmacy.logoUrl} alt={pharmacy.pharmacyName} />
           ) : (
             <span>{pharmacy.pharmacyName.charAt(0)}</span>
           )}
        </div>
        <div className={styles.headerInfo}>
            <h3 className={styles.pharmacyName}>{pharmacy.pharmacyName}</h3>
            <span className={styles.pharmacyGroup}>{pharmacy.group}</span>
        </div>
      </div>
      
      <div className={styles.cardBody}>
        <div className={styles.infoRow}>
            <UserIcon />
            <span>{pharmacy.pharmacistInCharge}</span>
        </div>
        <div className={styles.infoRow}>
            <LocationIcon />
            <span>{pharmacy.district}, {pharmacy.city}</span>
        </div>
      </div>

      <div className={styles.cardFooter}>
        <button className={styles.cardButton} onClick={() => alert('Mesaj gönderildi (simülasyon)!')}>
            <MessageIcon />
            Mesaj Gönder
        </button>
        <Link href={`/profile/${pharmacy.username}`} className={`${styles.cardButton} ${styles.btnPrimary}`}>
            <ProfileIcon />
            Profili Gör
        </Link>
      </div>
    </div>
  );
};

export default PharmacyCard;