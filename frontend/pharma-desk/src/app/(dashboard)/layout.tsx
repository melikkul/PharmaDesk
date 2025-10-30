// src/app/(dashboard)/layout.tsx
'use client';

import React from 'react';
import './dashboard/dashboard.css'; // Global dashboard stilleri

// Ana Bileşenler
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

// Panel Bileşenleri
import SlidePanel from '@/components/ui/SlidePanel';
import NotificationItem from '@/components/notifications/NotificationItem';
import MessageItem from '@/components/notifications/MessageItem';
import NotificationModal from '@/components/notifications/NotificationModal';
import ChatWindow from '@/components/chat/ChatWindow';
import CartPanel from '@/components/cart/CartPanel';

// Veri
import { pharmacyData } from '@/data/dashboardData';

// GÜNCELLEME: Hook'u ve Context'i import et
import { useDashboardPanels, DashboardContext } from '@/hooks/useDashboardPanels';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. ADIM: Tüm state ve fonksiyonları hook'tan al
  const panelValues = useDashboardPanels();

  // 2. ADIM: Değerleri (panelValues) Context Provider ile sarmala
  return (
    <DashboardContext.Provider value={panelValues}>
      <div className="dashboard-container">
        <Sidebar />
        
        <Header
          userData={pharmacyData}
          onMessageClick={panelValues.toggleMessagesPanel}
          onNotificationClick={panelValues.toggleNotificationsPanel}
          onCartClick={panelValues.toggleCartPanel}
          unreadNotificationCount={panelValues.unreadNotificationCount}
          unreadMessageCount={panelValues.unreadMessageCount}
          onLogout={panelValues.handleLogout}
        />

        <main className="main-content">
          {children} {/* children (sayfalar) artık context'e erişebilir */}
        </main>

        <SlidePanel
          title="Bildirimler"
          show={panelValues.showNotificationsPanel}
          onClose={panelValues.toggleNotificationsPanel}
          onMarkAllRead={panelValues.markAllNotificationsAsRead}
        >
          {panelValues.notifications.length > 0 ? (
              panelValues.notifications.map(notif => (
                  <NotificationItem key={notif.id} item={notif} onClick={panelValues.handleNotificationClick} />
              ))
          ) : (
              <div className="panel-empty-state">
                  <p>Yeni bildiriminiz yok.</p>
              </div>
          )}
        </SlidePanel>

        <SlidePanel
          title="Mesajlar"
          show={panelValues.showMessagesPanel}
          onClose={panelValues.toggleMessagesPanel}
          onMarkAllRead={panelValues.markAllMessagesAsRead}
        >
          {panelValues.messages.length > 0 ? (
              panelValues.messages.map(msg => (
                  <MessageItem key={msg.id} item={msg} onClick={panelValues.handleMessageClick} />
              ))
          ) : (
              <div className="panel-empty-state">
                  <p>Yeni mesajınız yok.</p>
              </div>
          )}
        </SlidePanel>

        <CartPanel show={panelValues.showCartPanel} onClose={panelValues.toggleCartPanel} />

        <NotificationModal
          notification={panelValues.selectedNotification}
          onClose={panelValues.closeNotificationModal}
        />

        <ChatWindow chat={panelValues.selectedChat} onClose={panelValues.closeChatWindow} />
      </div>
    </DashboardContext.Provider>
  );
}