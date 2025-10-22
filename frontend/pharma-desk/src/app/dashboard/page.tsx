'use client'; 

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import './dashboard.css';

// ANA BİLEŞENLER
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';

// KART BİLEŞENLERİ
import OffersCard from '../../components/dashboard/OffersCard';
import BalanceHistoryCard from '../../components/dashboard/BalanceHistoryCard';
import TransfersCard from '../../components/dashboard/TransfersCard';
import ShipmentsCard from '../../components/dashboard/ShipmentsCard';

// BİLDİRİM & MESAJ BİLEŞENLERİ
import SlidePanel from '../../components/ui/SlidePanel';
import NotificationItem from '../../components/notifications/NotificationItem';
import MessageItem from '../../components/notifications/MessageItem';
import NotificationModal from '../../components/notifications/NotificationModal';
import ChatWindow from '../../components/chat/ChatWindow';

// VERİLER
// DEĞİŞİKLİK: 'userData' yerine 'pharmacyData' import edildi
import {
  pharmacyData, 
  offersData,
  balanceHistoryData,
  transfersData,
  shipmentsData,
  initialNotifications,
  initialMessages
} from '../../data/dashboardData';

// Tipler (Daha merkezi bir yerden de import edilebilir)
type Notification = typeof initialNotifications[0];
type Message = typeof initialMessages[0];
type SelectedNotification = Notification & { detail?: string };


export default function DashboardPage() {
  // Her kart için ayrı limitler
  const OFFERS_LIMIT = 4;
  const BALANCE_HISTORY_LIMIT = 5;
  const TRANSFERS_LIMIT = 4;
  const SHIPMENTS_LIMIT = 4;

  // State (Durum) Yönetimi
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [selectedNotification, setSelectedNotification] = useState<SelectedNotification | null>(null);
  
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedChat, setSelectedChat] = useState<Message | null>(null);

  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);

  // --- FONKSİYONLAR ---

  // Örnek bir logout fonksiyonu
  const router = useRouter();

  const handleLogout = () => {
    // Tarayıcının standart onay penceresini kullanıyoruz
    if (window.confirm("Çıkış yapmak istediğinizden emin misiniz?")) {
      console.log("Çıkış yapma işlemi onaylandı. Yönlendiriliyor...");
      // Onay verilirse /anasayfa adresine yönlendir
      router.push('/anasayfa');
    } else {
      console.log("Çıkış yapma işlemi iptal edildi.");
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
    setShowNotificationsPanel(false);
  };

  const markAllNotificationsAsRead = (e: React.MouseEvent) => {
      e.preventDefault();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleMessageClick = (message: Message) => {
    setSelectedChat(message);
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, read: true } : m));
    setShowMessagesPanel(false);
  };

   const markAllMessagesAsRead = (e: React.MouseEvent) => {
      e.preventDefault();
      setMessages(prev => prev.map(m => ({ ...m, read: true })));
  };

  const toggleNotificationsPanel = () => {
      setShowNotificationsPanel(!showNotificationsPanel);
      setShowMessagesPanel(false);
  }

  const toggleMessagesPanel = () => {
      setShowMessagesPanel(!showMessagesPanel);
      setShowNotificationsPanel(false);
  }

  // Hesaplanmış Değerler
  const unreadNotificationCount = notifications.filter(n => !n.read).length;
  const unreadMessageCount = messages.filter(m => !m.read).length;

  return (
    <div className="dashboard-container">
      <Sidebar />

      <Header
        // DEĞİŞİKLİK: 'userData' prop'una 'pharmacyData' geçirildi
        userData={pharmacyData} 
        onMessageClick={toggleMessagesPanel}
        onNotificationClick={toggleNotificationsPanel}
        unreadNotificationCount={unreadNotificationCount}
        unreadMessageCount={unreadMessageCount}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <div className="content-grid">
          <OffersCard data={offersData} limit={OFFERS_LIMIT} />
          <BalanceHistoryCard data={balanceHistoryData} limit={BALANCE_HISTORY_LIMIT} />
          <TransfersCard data={transfersData} limit={TRANSFERS_LIMIT} />
          <ShipmentsCard data={shipmentsData} limit={SHIPMENTS_LIMIT} />
        </div>
      </main>

      <SlidePanel
        title="Bildirimler"
        show={showNotificationsPanel}
        onClose={() => setShowNotificationsPanel(false)}
        onMarkAllRead={markAllNotificationsAsRead}
      >
        {notifications.length > 0 ? (
            notifications.map(notif => (
                <NotificationItem key={notif.id} item={notif} onClick={handleNotificationClick} />
            ))
        ) : (
            <div className="panel-empty-state">
                <p>Yeni bildiriminiz yok.</p>
            </div>
        )}
      </SlidePanel>

      <SlidePanel
        title="Mesajlar"
        show={showMessagesPanel}
        onClose={() => setShowMessagesPanel(false)}
        onMarkAllRead={markAllMessagesAsRead}
      >
        {messages.length > 0 ? (
            messages.map(msg => (
                <MessageItem key={msg.id} item={msg} onClick={handleMessageClick} />
            ))
        ) : (
            <div className="panel-empty-state">
                <p>Yeni mesajınız yok.</p>
            </div>
        )}
      </SlidePanel>

      <NotificationModal
        notification={selectedNotification}
        onClose={() => setSelectedNotification(null)}
      />

      <ChatWindow chat={selectedChat} onClose={() => setSelectedChat(null)} />
    </div>
  );
}