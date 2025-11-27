// components/Header.tsx

import React, { useState, useCallback } from 'react';
import ProfileDropdown from './header/ProfileDropdown';
import { PriceDisplay } from '@/components/common';
import styles from './Header.module.css';
import { MessageIcon, NotificationIcon, CartIcon } from './ui/Icons';
import { useCart } from '../store/CartContext'; 
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../store/AuthContext';

interface HeaderPharmacyData {
  pharmacyName: string;
  balance: number;
  logoUrl: string | null;
  pharmacistInCharge: string;
  username: string;
  publicId?: string;
}

interface HeaderProps {
  userData: HeaderPharmacyData;
  onMessageClick: () => void;
  onNotificationClick: () => void;
  onCartClick: () => void;
  onLogout: () => void;
  onMenuClick: () => void; // NEW: Hamburger menu click
}

// Hamburger Icon Component
const HamburgerIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const Header: React.FC<HeaderProps> = ({ 
  userData, 
  onMessageClick, 
  onNotificationClick, 
  onCartClick,
  onLogout,
  onMenuClick 
}) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const { unreadCartItemCount } = useCart();
  const { token } = useAuth();
  const { unreadCount: unreadNotificationCount } = useNotifications(token);
  const unreadMessageCount = 0;

  const toggleDropdown = useCallback(() => {
    setDropdownOpen(prev => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setDropdownOpen(false);
  }, []);

  return (
    <header className={styles.header}>
      {/* Hamburger Menu - Mobile Only */}
      <button className={styles.hamburgerButton} onClick={onMenuClick} aria-label="Toggle Menu">
        <HamburgerIcon />
      </button>

      <div className={styles.searchBar}>
        <input type="text" placeholder="İlaç Adı / Sipariş Numarası / İlaç Barkod" />
      </div>
      <div className={styles.headerActions}>
        <span className={styles.pharmacyName}>{userData.pharmacyName}</span>
        
        <button className={`${styles.iconButton} ${unreadCartItemCount > 0 ? styles.hasBadge : ''}`} onClick={onCartClick} data-badge={unreadCartItemCount > 0 ? unreadCartItemCount : undefined}>
          <CartIcon />
        </button>

        <button className={`${styles.iconButton} ${unreadMessageCount > 0 ? styles.hasBadge : ''}`} onClick={onMessageClick} data-badge={unreadMessageCount > 0 ? unreadMessageCount : undefined}>
          <MessageIcon />
        </button>
        <button className={`${styles.iconButton} ${unreadNotificationCount > 0 ? styles.hasBadge : ''}`} onClick={onNotificationClick} data-badge={unreadNotificationCount > 0 ? unreadNotificationCount : undefined}>
          <NotificationIcon />
        </button>
        
        <div className={styles.userProfile} onClick={toggleDropdown}>
          <div className={styles.balanceInfo}>
            <span>Bakiyen</span>
            <strong>
              <PriceDisplay amount={userData.balance} />
            </strong>
          </div>
          <div
            className={styles.avatarPlaceholder}
            style={{ backgroundImage: userData.logoUrl ? `url(${userData.logoUrl})` : 'none' }}
          >
            {!userData.logoUrl && <span>{userData.pharmacyName.charAt(0)}</span>}
          </div>
          {isDropdownOpen && <ProfileDropdown user={userData} onClose={closeDropdown} onLogout={onLogout} />}
        </div>
      </div>
    </header>
  );
};

export default Header;