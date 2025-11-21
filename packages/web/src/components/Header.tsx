// components/Header.tsx

// ### OPTİMİZASYON: 'useCallback' import edildi ###
import React, { useState, useCallback } from 'react';
import ProfileDropdown from './header/ProfileDropdown';
import styles from './Header.module.css';
// YENİ: CartIcon import edildi
import { MessageIcon, NotificationIcon, CartIcon } from './ui/Icons';
// HATA DÜZELTMESİ: useCart burada import edildi
import { useCart } from '../context/CartContext'; 

// Arayüz, eczane verisine göre güncellendi
interface HeaderPharmacyData {
  pharmacyName: string;
  balance: number;
  logoUrl: string | null;
  pharmacistInCharge: string;
  username: string;
  publicId?: string; // YENİ
}

interface HeaderProps {
  userData: HeaderPharmacyData; // Prop adı aynı kalsa da tipi artık HeaderPharmacyData
  onMessageClick: () => void;
  onNotificationClick: () => void;
  onCartClick: () => void; // YENİ: Sepet tıklama prop'u
  unreadNotificationCount: number;
  unreadMessageCount: number;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  userData, 
  onMessageClick, 
  onNotificationClick, 
  onCartClick, // YENİ
  unreadNotificationCount, 
  unreadMessageCount, 
  onLogout 
}) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const { unreadCartItemCount } = useCart(); // YENİ: Sepet sayısını context'ten al

  // ### OPTİMİZASYON: useCallback ###
  // Dropdown'ı açıp kapatan fonksiyon memoize edildi.
  const toggleDropdown = useCallback(() => {
    setDropdownOpen(prev => !prev);
  }, []);

  // ### OPTİMİZASYON: useCallback ###
  // Dropdown'ı kapatan fonksiyon (ProfileDropdown'a prop olarak geçmek için)
  const closeDropdown = useCallback(() => {
    setDropdownOpen(false);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.searchBar}>
        <input type="text" placeholder="İlaç Adı / Sipariş Numarası / İlaç Barkod" />
      </div>
      <div className={styles.headerActions}>
        <span className={styles.pharmacyName}>{userData.pharmacyName}</span>
        
        {/* YENİ: Sepet Butonu */}
        <button className={`${styles.iconButton} ${styles.hasBadge}`} onClick={onCartClick} data-badge={unreadCartItemCount}>
          <CartIcon />
        </button>

        <button className={`${styles.iconButton} ${styles.hasBadge}`} onClick={onMessageClick} data-badge={unreadMessageCount}>
          <MessageIcon />
        </button>
        <button className={`${styles.iconButton} ${styles.hasBadge}`} onClick={onNotificationClick} data-badge={unreadNotificationCount}>
          <NotificationIcon />
        </button>
        
        <div className={styles.userProfile} onClick={toggleDropdown}>
          <div className={styles.balanceInfo}>
            <span>Bakiyen</span>
            <strong>{userData.balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</strong>
          </div>
          <div
            className={styles.avatarPlaceholder}
            style={{ backgroundImage: userData.logoUrl ? `url(${userData.logoUrl})` : 'none' }}
          >
            {/* GÜNCELLENDİ: Logo yoksa Eczane adının ilk harfini göster */}
            {!userData.logoUrl && <span>{userData.pharmacyName.charAt(0)}</span>}
          </div>
          {isDropdownOpen && <ProfileDropdown user={userData} onClose={closeDropdown} onLogout={onLogout} />}
        </div>
      </div>
    </header>
  );
};

export default Header;