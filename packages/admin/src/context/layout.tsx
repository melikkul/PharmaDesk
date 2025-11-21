'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/AdminSidebar';
import Header from '@/components/Header';
import './dashboard.css'; // Ana dashboard stilleri

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Bu state'ler ve fonksiyonlar, Header veya diğer alt bileşenlere
  // prop olarak geçirilerek kullanılabilir.
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    /* ... bildirim verileriniz ... */
  ]);

  const handleLogout = () => {
    // Çıkış yapma mantığı
    console.log('Çıkış yapıldı');
  };

  return (
    <div className="dashboard-container">
      <Sidebar onLogout={handleLogout} />
      <div className="main-content-wrapper">
        <Header
          userName="Admin" // Bu veriyi AuthContext'ten alabilirsiniz
          onLogout={handleLogout}
        />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}