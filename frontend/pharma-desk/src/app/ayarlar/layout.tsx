// app/ayarlar/layout.tsx
'use client';
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

// Gerekli tüm bileşenleri import ediyoruz
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import SlidePanel from '../../components/ui/SlidePanel';
import NotificationItem from '../../components/notifications/NotificationItem';
import MessageItem from '../../components/notifications/MessageItem';
import NotificationModal from '../../components/notifications/NotificationModal';
import ChatWindow from '../../components/chat/ChatWindow';

// Veri ve stilleri import ediyoruz
// DEĞİŞİKLİK: 'userData' yerine 'pharmacyData' import edildi
import { pharmacyData, initialNotifications, initialMessages } from '../../data/dashboardData';
import '../dashboard/dashboard.css';
import styles from './layout.module.css'; // Bu layout'a özel stiller

// Tipleri tanımlıyoruz
type Notification = typeof initialNotifications[0];
type Message = typeof initialMessages[0];
interface SelectedNotification extends Omit<Notification, 'read'> {
  detail?: string;
}

// Yatay navigasyon menüsü component'i
const SettingsNav = () => {
  const pathname = usePathname();
  const navItems = [
    { href: '/ayarlar/profil', label: 'Profilim' },
    { href: '/ayarlar/eczane', label: 'Eczane Bilgileri' },
    { href: '/ayarlar', label: 'Genel Ayarlar' },
  ];

  return (
    <nav className={styles.settingsNav}>
      {navItems.map(item => (
        <Link key={item.href} href={item.href} className={pathname === item.href ? styles.active : ''}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
};


export default function AyarlarPagesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
  // State yönetimi ve fonksiyonlar (bildirimler, mesajlar vb.) aynı kalıyor
  const [notifications, setNotifications] = React.useState<Notification[]>(initialNotifications);
  const [selectedNotification, setSelectedNotification] = React.useState<SelectedNotification | null>(null);
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [selectedChat, setSelectedChat] = React.useState<Message | null>(null);
  const [showNotificationsPanel, setShowNotificationsPanel] = React.useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = React.useState(false);

  const handleLogout = () => {
    if (window.confirm("Çıkış yapmak istediğinizden emin misiniz?")) {
      router.push('/anasayfa');
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
        <div className={styles.settingsContainer}>
          <SettingsNav />
          <div className={styles.settingsPageContent}>
            {children}
          </div>
        </div>
      </main>

      {/* Açılır paneller ve modallar (bildirim, mesaj vb.) aynı kalıyor */}
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
            <div className="panel-empty-state"><p>Yeni bildiriminiz yok.</p></div>
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
            <div className="panel-empty-state"><p>Yeni mesajınız yok.</p></div>
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
