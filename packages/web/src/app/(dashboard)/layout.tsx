// src/app/(dashboard)/layout.tsx
'use client';

import React, { useEffect } from 'react'; // React.memo için 'React' import edildi
import './dashboard/dashboard.css'; // Global dashboard stilleri
import { useRouter } from 'next/navigation';

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
// GÜNCELLEME: Hook'u ve Context'i import et
import { useDashboardPanels } from '@/hooks/useDashboardPanels';
import { DashboardContext, useDashboardContext, Notification, Message } from '@/context/DashboardContext';
import { useAuth } from '@/context/AuthContext';
// HATA DÜZELTME: CartProvider'ı import et
import { CartProvider } from '@/context/CartContext';


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
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Authentication check - redirect to homepage if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[Dashboard Layout] User not authenticated, performing logout and redirecting');
      logout(); // Clear cookies/storage to prevent middleware loop
      // router.push('/anasayfa'); // logout() already redirects to '/'
    }
  }, [isAuthenticated, isLoading, logout, router]);

  // Show loading or nothing while checking authentication
  if (isLoading || !isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  // Merge real user data with dummy data for missing fields (like balance)
  const headerUserData = {
    ...pharmacyData,
    pharmacyName: user?.pharmacyName || pharmacyData.pharmacyName,
    pharmacistInCharge: user?.fullName || pharmacyData.pharmacistInCharge,
    username: user?.fullName || pharmacyData.username,
    publicId: user?.publicId, // YENİ: PublicId'yi geçir
  };

  // 2. ADIM: Değerleri (panelValues) Context Provider ile sarmala
  return (
    <CartProvider>
      <DashboardContext.Provider value={panelValues}>
        <div className="dashboard-container">
          <Sidebar />
          
          <Header
            userData={headerUserData}
            onMessageClick={panelValues.toggleMessagesPanel}
            onNotificationClick={panelValues.toggleNotificationsPanel}
            onCartClick={panelValues.toggleCartPanel}
            unreadNotificationCount={panelValues.unreadNotificationCount}
            unreadMessageCount={panelValues.unreadMessageCount}
            onLogout={logout}
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
    </CartProvider>
  );
}