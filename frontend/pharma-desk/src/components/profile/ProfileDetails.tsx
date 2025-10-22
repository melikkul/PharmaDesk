// components/profile/ProfileDetails.tsx
import React from 'react';
import Link from 'next/link';
import styles from './ProfileDetails.module.css';
import { PharmacyProfileData } from '../../data/dashboardData';

interface ProfileDetailsProps {
  pharmacy: PharmacyProfileData;
  isOwnProfile: boolean;
}

// İkonlar
const InfoIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;
const LocationIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const CalendarIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const EditIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
// DEĞİŞİKLİK: SVG attributeları camelCase olarak düzeltildi
const LicenseIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 10c-.8 0-1.5.7-1.5 1.5v1.5c0 .8.7 1.5 1.5 1.5h1.5c.8 0 1.5-.7 1.5-1.5v-1.5c0-.8-.7-1.5-1.5-1.5z"/><path d="M15.5 10c-.8 0-1.5.7-1.5 1.5v1.5c0 .8.7 1.5 1.5 1.5h1.5c.8 0 1.5-.7 1.5-1.5v-1.5c0-.8-.7-1.5-1.5-1.5z"/><path d="M4 6h16"/><path d="M4 18h16"/><path d="M6 2v4"/><path d="M18 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/></svg>;


const ProfileDetails: React.FC<ProfileDetailsProps> = ({ pharmacy, isOwnProfile }) => {
  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.headerTitle}>
            <InfoIcon />
            <h3>Hakkında</h3>
          </div>
          {isOwnProfile && (
            <Link href="/ayarlar/eczane" className={styles.editIcon}>
              <EditIcon />
            </Link>
          )}
        </div>
        <div className={styles.cardBody}>
          <p>{pharmacy.about || 'Eczane hakkında bilgi yok.'}</p>
        </div>
      </div>
      <div className={styles.card}>
         <div className={styles.cardHeader}>
            <div className={styles.headerTitle}>
                <h3>Eczane Künyesi</h3>
            </div>
         </div>
         <div className={styles.cardBody}>
            <ul className={styles.infoList}>
                <li>
                    <LicenseIcon />
                    <span><strong>Ruhsat No:</strong> {pharmacy.licenseNumber}</span>
                </li>
                <li>
                    <LocationIcon />
                    <span><strong>Adres:</strong> {pharmacy.location}</span>
                </li>
                 <li>
                    <CalendarIcon />
                    <span><strong>Katılım Tarihi:</strong> {pharmacy.registrationDate}</span>
                </li>
            </ul>
         </div>
      </div>
    </>
  );
};

export default ProfileDetails;