// src/app/(dashboard)/layout.tsx
'use client';

import React, { useEffect } from 'react'; // React.memo için 'React' import edildi
import './dashboard/dashboard.css'; // Global dashboard stilleri
import { useRouter, usePathname } from 'next/navigation';

// Ana Bileşenler
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

// Panel Bileşenleri
import SlidePanel from '@/components/ui/SlidePanel';
import NotificationItem from '@/components/notifications/NotificationItem';
import MessageItem from '@/components/notifications/MessageItem';
import NotificationModal from '@/components/notifications/NotificationModal';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { FloatingChatWindow } from '@/components/chat/FloatingChatWindow';
import CartPanel from '@/components/cart/CartPanel';
import SubscriptionBanner from '@/components/subscription/SubscriptionBanner';

// Veri
import { pharmacyData } from '@/lib/dashboardData';

// GÜNCELLEME: Hook'u ve Context'i import et
// GÜNCELLEME: Hook'u ve Context'i import et
import { useDashboardPanels } from '@/hooks/useDashboardPanels';
import { DashboardContext, useDashboardContext, Notification, Message } from '@/store/DashboardContext';
import { useAuth } from '@/store/AuthContext';
import { ChatProvider } from '@/store/ChatContext';
import { GroupProvider } from '@/store/GroupContext';
import { Toaster } from 'sonner';


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
  const { user, logout, isAuthenticated, isLoading, token } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // 🆕 For subscription page exception
  
  // Sidebar state for mobile
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  
  // Balance state - fetch from API
  const [balance, setBalance] = React.useState<number>(0);
  
  // 🆕 Check if current page is subscription page (should NOT be blurred)
  const isSubscriptionPage = pathname === '/abonelik';

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Authentication check - redirect to homepage if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('[Dashboard Layout] User not authenticated, performing logout and redirecting');
      logout(); // Clear cookies/storage to prevent middleware loop
    }
  }, [isAuthenticated, isLoading, logout, router]);

  // Fetch balance from API
  React.useEffect(() => {
    const fetchBalance = async () => {
      if (!token) return;
      try {
        const API_BASE_URL = '';
        const response = await fetch(`${API_BASE_URL}/api/transactions/balance`, {
          credentials: 'include',
          headers: token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (response.ok) {
          const data = await response.json();
          setBalance(data.balance);
        }
      } catch (err) {
        console.error('[Layout] Bakiye çekilemedi:', err);
      }
    };
    fetchBalance();
  }, [token]);

  // Merge real user data with dummy data for missing fields (like balance)
  const headerUserData = {
    ...pharmacyData,
    pharmacyName: user?.pharmacyName || pharmacyData.pharmacyName,
    pharmacistInCharge: user?.fullName || pharmacyData.pharmacistInCharge,
    username: user?.fullName || pharmacyData.username,
    publicId: user?.publicId,
    balance: balance, // API'den gelen bakiye
  };

  // Show loading or nothing while checking authentication
  if (isLoading || !isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
        <DashboardContext.Provider value={panelValues}>
            <GroupProvider>
              <ChatProvider>
                  <Toaster position="top-right" richColors />
                  <div className="dashboard-container">
                    <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
                    
                    <Header
                      userData={headerUserData}
                      onMessageClick={panelValues.toggleMessagesPanel}
                      onNotificationClick={panelValues.toggleNotificationsPanel}
                      onCartClick={panelValues.toggleCartPanel}
                      onLogout={logout}
                      onMenuClick={toggleSidebar}
                    />

                    {/* 🆕 Subscription Warning Banner */}
                    <SubscriptionBanner 
                      subscriptionStatus={user?.subscriptionStatus} 
                      subscriptionExpireDate={user?.subscriptionExpireDate} 
                    />

                    {/* 🆕 Global Subscription Restriction for ALL pages EXCEPT /abonelik */}
                    {((user?.subscriptionStatus === 'Cancelled' || user?.subscriptionStatus === 'PastDue') && !isSubscriptionPage) ? (
                      <main className="main-content subscription-restricted-wrapper">
                        <div className="subscription-restricted-content">
                          {children}
                        </div>
                        <div className="subscription-restriction-overlay">
                          <div className="restriction-icon">🔒</div>
                          <h3>Abonelik Gerekli</h3>
                          <p>
                            {user?.subscriptionStatus === 'Cancelled' 
                              ? 'Aboneliğiniz iptal edilmiştir.'
                              : 'Ödemeniz gecikmiştir.'}
                            <br />
                            Platformu kullanmaya devam etmek için aboneliğinizi yenileyin.
                          </p>
                          <a href="/abonelik" className="action-button">
                            Abonelik Yenile
                          </a>
                        </div>
                      </main>
                    ) : (
                      <main className="main-content">
                        {children}
                      </main>
                    )}

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
                    >
                      <ChatPanel 
                        onSelectUser={panelValues.openFloatingChat}
                      />
                    </SlidePanel>

                    <CartPanel show={panelValues.showCartPanel} onClose={panelValues.toggleCartPanel} />

                    <NotificationModal
                      notification={panelValues.selectedNotification}
                      onClose={panelValues.closeNotificationModal}
                    />

                    {/* Floating Chat Windows */}
                    {panelValues.openChats.map((chatUserId, index) => (
                      <FloatingChatWindow
                        key={chatUserId}
                        otherUserId={chatUserId}
                        isMinimized={panelValues.minimizedChats.includes(chatUserId)}
                        onMinimize={() => panelValues.toggleMinimizeChat(chatUserId)}
                        onClose={() => panelValues.closeChat(chatUserId)}
                        position={{ bottom: 0, right: 20 + (index * 370) }}
                      />
                    ))}
                  </div>
                </ChatProvider>
            </GroupProvider>
        </DashboardContext.Provider>
  );
}