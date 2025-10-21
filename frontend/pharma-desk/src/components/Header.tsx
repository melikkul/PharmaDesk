// components/Header.tsx

import React, { useState } from 'react';
import ProfileDropdown from './header/ProfileDropdown'; // YENİ: Dropdown bileşenini import ediyoruz

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
  onLogout: () => void; // YENİ: Logout fonksiyonu prop olarak eklendi
}

const Header: React.FC<HeaderProps> = ({ userData, onMessageClick, onNotificationClick, unreadNotificationCount, unreadMessageCount, onLogout }) => {
  // YENİ: Dropdown'ın açık/kapalı durumunu tutan state
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="header">
      <div className="search-bar">
        <input type="text" placeholder="İlaç Adı / Sipariş Numarası / İlaç Barkod" />
      </div>
      <div className="header-actions">
        <span className="pharmacy-name">{userData.pharmacyName}</span>
        <button className="icon-button has-badge" onClick={onMessageClick} data-badge={unreadMessageCount}>
          <img src="/messageIcon.svg" alt="Mesajlar" className="icon-img" />
        </button>
        <button className="icon-button has-badge" onClick={onNotificationClick} data-badge={unreadNotificationCount}>
          <img src="/notificationIcon.svg" alt="Bildirimler" className="icon-img" />
        </button>
        
        {/* YENİ: Profil alanına tıklandığında dropdown'ı aç/kapa */}
        <div className="user-profile" onClick={() => setDropdownOpen(prev => !prev)}>
          <div className="balance-info">
            <span>Bekleyen</span>
            <strong>{userData.balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</strong>
          </div>
          <div
            className="avatar-placeholder"
            style={{ backgroundImage: userData.avatarUrl ? `url(${userData.avatarUrl})` : 'none' }}
          >
          </div>
          {/* YENİ: State true ise dropdown'ı render et */}
          {isDropdownOpen && <ProfileDropdown user={userData} onClose={() => setDropdownOpen(false)} onLogout={onLogout} />}
        </div>
      </div>
    </header>
  );
};

export default Header;