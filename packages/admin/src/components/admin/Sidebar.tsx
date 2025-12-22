'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Yol doğru, dosya oluşturuldu.
import { User } from '@/context/AuthContext'; 

interface SidebarProps {
  onLogout: () => void;
  user: User | null;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout, user }) => {
  const pathname = usePathname();

  const menuItems = [
    { icon: '📊', label: 'Dashboard', href: '/dashboard' },
    { icon: '👥', label: 'Eczaneler', href: '/users' },
    { icon: '✅', label: 'Onay Bekleyenler', href: '/approvals' },
    { icon: '💊', label: 'İlaç Yönetimi', href: '/drugs' },
    { icon: '📦', label: 'Transferler', href: '/transactions' },
    { icon: '🏢', label: 'Gruplar', href: '/groups' },
  ];

  return (
    <aside className="w-64 bg-secondary text-white h-screen fixed left-0 top-0 flex flex-col shadow-lg z-50">
      <div className="p-6 border-b border-secondary-light flex items-center justify-center">
        <h1 className="text-2xl font-bold text-primary tracking-wider">PHARMADESK</h1>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-6">
        <ul className="space-y-2 px-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link 
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    isActive 
                      ? 'bg-primary text-white shadow-md' 
                      : 'text-gray-300 hover:bg-secondary-light hover:text-white'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-secondary-light space-y-4">
        <div className="bg-secondary-light rounded-lg p-3">
          <p className="text-xs text-gray-400">Giriş Yapan Yönetici</p>
          <p className="font-semibold truncate">{user?.name || 'Admin'}</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white"
        >
          <span className="text-xl">🚪</span>
          <span className="font-medium">Çıkış Yap</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
