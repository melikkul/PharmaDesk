// components/profile/ProfileDetails.tsx
// YENİ: useState ve useCallback eklendi
import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import styles from './ProfileDetails.module.css';
import { PharmacyProfileData } from '../../data/dashboardData';

interface ProfileDetailsProps {
  pharmacy: {
    pharmacyName: string;
    gln: string;
    location: string;
    registrationDate: string;
    about?: string;
    [key: string]: any;
  };
  isOwnProfile: boolean;
}

// İkonlar
const InfoIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;
const LocationIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const CalendarIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const EditIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const LicenseIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 10c-.8 0-1.5.7-1.5 1.5v1.5c0 .8.7 1.5 1.5 1.5h1.5c.8 0 1.5-.7 1.5-1.5v-1.5c0-.8-.7-1.5-1.5-1.5z"/><path d="M15.5 10c-.8 0-1.5.7-1.5 1.5v1.5c0 .8.7 1.5 1.5 1.5h1.5c.8 0 1.5-.7 1.5-1.5v-1.5c0-.8-.7-1.5-1.5-1.5z"/><path d="M4 6h16"/><path d="M4 18h16"/><path d="M6 2v4"/><path d="M18 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/></svg>;
const CopyIcon = (props: { className?: string }) => <svg className={props.className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>;
const CheckIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--positive-color)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;


// YENİ: Güvenli ve geri-düşüşlü kopyalama fonksiyonu
const copyToClipboard = (text: string): Promise<void> => {
  // Modern, güvenli (HTTPS/localhost) yöntem
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }

  // Eski, geri-düşüş (fallback) yöntemi (HTTP vb. için)
  return new Promise((resolve, reject) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Elemanı görünmez yap ve ekran dışına taşı
      textArea.style.position = 'fixed';
      textArea.style.top = '-999999px';
      textArea.style.left = '-999999px';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', ''); // Yazmaya karşı koru
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select(); // Metni seç
      
      // Kopyalama komutunu çalıştır
      document.execCommand('copy');
      
      document.body.removeChild(textArea);
      resolve();
    } catch (error) {
      console.error('Eski kopyalama yöntemi başarısız oldu', error);
      reject(error);
    }
  });
};


const ProfileDetails: React.FC<ProfileDetailsProps> = ({ pharmacy, isOwnProfile }) => {
  const [isCopied, setIsCopied] = useState(false);

  // GÜNCELLENDİ: Yeni kopyalama fonksiyonunu kullan
  const handleCopyGln = useCallback(() => {
    if (isCopied) return;
    
    copyToClipboard(pharmacy.gln).then(() => {
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000); // 2 saniye sonra "Kopyalandı" yazısını geri al
    }).catch(err => {
      console.error('Kopyalama başarısız oldu: ', err);
      alert('Otomatik kopyalama başarısız oldu. Lütfen manuel olarak kopyalayın.');
    });
  }, [pharmacy.gln, isCopied]);

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
                {/* --- DEĞİŞİKLİK BURADA --- */}
                <li>
                  {isCopied ? <CheckIcon /> : <LicenseIcon />} 
                  <span>
                    <strong>GLN:</strong>
                    
                    {/* Kopyalama durumu veya normal GLN numarasını göster */}
                    {isCopied ? (
                      <span className={styles.copiedText}>Kopyalandı!</span>
                    ) : (
                      <span 
                        className={styles.copyableGln} // Tıklanabilir alan için yeni class
                        onClick={handleCopyGln} // Güncellenmiş fonksiyon
                        title="GLN numarasını kopyalamak için tıkla"
                      >
                        {pharmacy.gln}
                        <CopyIcon className={styles.copyIconHint} />
                      </span>
                    )}
                  </span>
                </li>
                {/* --- DEĞİŞİKLİK SONU --- */}
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

export default React.memo(ProfileDetails);