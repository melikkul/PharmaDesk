// components/header/ProfileDropdown.tsx
// ### OPTİMİZASYON: 'useCallback' import edildi ###
import React, { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from './ProfileDropdown.module.css';

const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06-.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>;
const PharmacyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M12 11v-1"></path><path d="M10 13h4"></path><path d="M12 15v1"></path></svg>;

// Arayüz eczane verisine göre güncellendi
interface ProfileDropdownProps {
  user: {
    pharmacyName: string;
    pharmacistInCharge: string;
    username: string;
    publicId?: string; // YENİ
  };
  onClose: () => void;
  onLogout: () => void;
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ user, onClose, onLogout }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // ### OPTİMİZASYON: useCallback ###
  // 'onLogout' prop'unu çağıran fonksiyon memoize edildi.
  const handleLogoutClick = useCallback(() => {
    // 'onClose' prop'u 'onLogout'tan önce çağrılabilir (opsiyonel)
    // onClose(); 
    onLogout();
  }, [onLogout]);

  return (
    <div className={styles.profileDropdown} ref={dropdownRef}>
      <Link href={`/profil/${user.publicId || user.username}`} className={styles.dropdownHeaderLink} onClick={onClose}>
        <div className={styles.dropdownHeader}>
          <strong>{user.pharmacyName}</strong>
          <span>Sorumlu: {user.pharmacistInCharge}</span>
        </div>
      </Link>
      <ul className={styles.dropdownMenu}>
        <li>
          <Link href="/ayarlar/profil" onClick={onClose}><UserIcon /> Kullanıcı Ayarları</Link>
        </li>
        <li>
          <Link href="/ayarlar/eczane" onClick={onClose}><PharmacyIcon /> Eczane Profili</Link>
        </li>
        <li>
          <Link href="/ayarlar" onClick={onClose}><SettingsIcon /> Genel Ayarlar</Link>
        </li>
      </ul>
      <div className={styles.dropdownFooter}>
        <button onClick={handleLogoutClick}><LogoutIcon /> Çıkış Yap</button>
      </div>
    </div>
  );
};

// ### OPTİMİZASYON: React.memo ###
// Prop'ları (user, onClose, onLogout) değişmediği sürece
// (ki bu prop'lar artık üst bileşenlerde memoize edildi)
// bu bileşenin yeniden render olması engellendi.
export default React.memo(ProfileDropdown);