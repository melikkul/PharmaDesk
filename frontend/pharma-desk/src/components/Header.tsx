// components/Header.tsx

import React, { useState } from 'react';
import ProfileDropdown from './header/ProfileDropdown';
import styles from './Header.module.css';

interface UserData {
  pharmacyName: string;
  balance: number;
  avatarUrl: string | null;
  userName: string;
}

interface HeaderProps {
  userData: UserData;
  onMessageClick: () => void;
  onNotificationClick: () => void;
  unreadNotificationCount: number;
  unreadMessageCount: number;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ userData, onMessageClick, onNotificationClick, unreadNotificationCount, unreadMessageCount, onLogout }) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.searchBar}>
        <input type="text" placeholder="İlaç Adı / Sipariş Numarası / İlaç Barkod" />
      </div>
      <div className={styles.headerActions}>
        <span className={styles.pharmacyName}>{userData.pharmacyName}</span>
        <button className={`${styles.iconButton} ${styles.hasBadge}`} onClick={onMessageClick} data-badge={unreadMessageCount}>
          <img src="/messageIcon.svg" alt="Mesajlar" className={styles.iconImg} />
        </button>
        <button className={`${styles.iconButton} ${styles.hasBadge}`} onClick={onNotificationClick} data-badge={unreadNotificationCount}>
          <img src="/notificationIcon.svg" alt="Bildirimler" className={styles.iconImg} />
        </button>
        
        <div className={styles.userProfile} onClick={() => setDropdownOpen(prev => !prev)}>
          <div className={styles.balanceInfo}>
            <span>Bekleyen</span>
            <strong>{userData.balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</strong>
          </div>
          <div
            className={styles.avatarPlaceholder}
            style={{ backgroundImage: userData.avatarUrl ? `url(${userData.avatarUrl})` : 'none' }}
          >
          </div>
          {isDropdownOpen && <ProfileDropdown user={userData} onClose={() => setDropdownOpen(false)} onLogout={onLogout} />}
        </div>
      </div>
    </header>
  );
};

export default Header;