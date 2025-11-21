'use client';

import React from 'react';
import { User } from '@/context/AuthContext'; // Yol doğru, dosya oluşturuldu.

interface HeaderProps {
  user: User | null;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const getInitials = (name?: string) => {
    if (!name) return 'A';
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="h-20 bg-surface border-b border-border flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold text-text-primary">Yönetim Paneli</h2>
      </div>

      <div className="flex items-center gap-6">
        <button
          className="p-2 text-text-secondary hover:text-primary transition-colors relative"
          aria-label="Bildirimler"
        >
          <span className="text-xl">🔔</span>
          {/* <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span> */}
        </button>
        
        <div className="flex items-center gap-3 pl-6 border-l border-border">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-text-primary">{user?.name || 'Admin'}</p>
            <p className="text-xs text-text-secondary">{user?.email || ''}</p>
          </div>
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold border border-primary/20">
            {getInitials(user?.name)}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
