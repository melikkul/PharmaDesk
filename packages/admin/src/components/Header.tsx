'use client';

import React from 'react';

interface HeaderProps {
  userName: string;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ userName, onLogout }) => {
  return (
    <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6 sticky top-0 z-10">
      <h2 className="text-xl font-semibold text-gray-800">Admin Panel</h2>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">Hoşgeldin, {userName}</span>
        <button 
          onClick={onLogout} 
          className="text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Çıkış
        </button>
      </div>
    </header>
  );
};

export default Header;
