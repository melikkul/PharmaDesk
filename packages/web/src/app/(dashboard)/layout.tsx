// src/app/(dashboard)/layout.tsx
'use client';

import React from 'react'; // React.memo için 'React' import edildi
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
import { useDashboardPanels, DashboardContext, Notification, Message } from '@/hooks/useDashboardPanels';

// ### OPTİMİZASYON: Bildirim Listesi Ayrı Bileşene Taşındı ve Memoize Edildi ###
// Bu bileşen, 'items' veya 'onClick' değişmediği sürece yeniden render olmaz.
const NotificationList = React.memo(({ items, onClick }: { items: Notification[], onClick: (item: Notification) => void }) => {
  if (items.length === 0) {
    return (
      <div className="panel-empty-state">
        <p>Yeni bildiriminiz yok.</p>
      </div>
    );
  }
  
  return (
    <>
      {items.map(notif => (
        <NotificationItem key={notif.id} item={notif} onClick={onClick} />
      ))}
    </>
  );
});
NotificationList.displayName = 'NotificationList'; // Debugging için

// ### OPTİMİZASYON: Mesaj Listesi Ayrı Bileşene Taşındı ve Memoize Edildi ###
// Bu bileşen, 'items' veya 'onClick' değişmediği sürece yeniden render olmaz.
const MessageList = React.memo(({ items, onClick }: { items: Message[], onClick: (item: Message) => void }) => {
  if (items.length === 0) {
    return (
      <div className="panel-empty-state">
        <p>Yeni mesajınız yok.</p>
      </div>
    );
  }
  
  return (
    <>
      {items.map(msg => (
        <MessageItem key={msg.id} item={msg} onClick={onClick} />
      ))}
    </>
  );
});
MessageList.displayName = 'MessageList'; // Debugging için


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
          {/* ### OPTİMİZASYON: Liste render'ı memoize edilmiş bileşene devredildi ### */}
          <NotificationList 
            items={panelValues.notifications} 
            onClick={panelValues.handleNotificationClick} 
          />
        </SlidePanel>

        <SlidePanel
          title="Mesajlar"
          show={panelValues.showMessagesPanel}
          onClose={panelValues.toggleMessagesPanel}
          onMarkAllRead={panelValues.markAllMessagesAsRead}
        >
          {/* ### OPTİMİZASYON: Liste render'ı memoize edilmiş bileşene devredildi ### */}
          <MessageList 
            items={panelValues.messages} 
            onClick={panelValues.handleMessageClick} 
          />
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