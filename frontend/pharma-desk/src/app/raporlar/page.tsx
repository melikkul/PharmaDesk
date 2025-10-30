// src/app/raporlar/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// Alias kullanıldı
import '../dashboard/dashboard.css';
import styles from './raporlar.module.css'; // Yeni CSS modülü

// ANA BİLEŞENLER (Alias kullanıldı)
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ReportCard from '@/components/raporlar/ReportCard'; // Yeni Rapor Kartı bileşeni

// BİLDİRİM & MESAJ BİLEŞENLERİ (Alias kullanıldı)
import SlidePanel from '@/components/ui/SlidePanel';
import NotificationItem from '@/components/notifications/NotificationItem';
import MessageItem from '@/components/notifications/MessageItem';
import NotificationModal from '@/components/notifications/NotificationModal';
import ChatWindow from '@/components/chat/ChatWindow';
import CartPanel from '@/components/cart/CartPanel';

// VERİLER (Alias kullanıldı)
import {
  pharmacyData,
  initialNotifications,
  initialMessages
} from '@/data/dashboardData';

// Tipler
type Notification = typeof initialNotifications[0];
type Message = typeof initialMessages[0];
type SelectedNotification = Notification & { detail?: string };

// GÜNCELLENMİŞ Rapor Listesi
const reportList = [
  {
    title: 'Finansal Özet Raporu',
    description: 'Belirli bir dönemdeki toplam ciro, maliyet ve net kârınızı grafiksel olarak görün.',
    icon: 'sales', // İkon tipi (ReportCard bileşeni içinde yönetilecek)
    link: '/raporlar/ozet'
  },
  {
    title: 'Envanter Değer Raporu',
    description: 'Mevcut stoklarınızın toplam maliyetini, satış değerini ve kategori dağılımını analiz edin.',
    icon: 'inventory',
    link: '/raporlar/envanter'
  },
  {
    title: 'Miad Raporu',
    description: 'Miadı yaklaşan ilaçlarınızı listeleyin ve miad kaybını önlemek için strateji belirleyin.',
    icon: 'expiry',
    link: '/raporlar/miad'
  },
  {
    title: 'Teklif Performans Raporu',
    description: 'Hangi tekliflerinizin popüler olduğunu ve satışa dönüşme oranlarını ölçün.',
    icon: 'performance',
    link: '/raporlar/performans'
  },
  {
    title: 'Piyasa Talep Raporu',
    description: 'Sistemde aranan ama sizde olmayan ilaçları görerek talebi keşfedin.',
    icon: 'demand',
    link: '/raporlar/talep'
  },
];


export default function RaporlarPage() {
  const router = useRouter();

  // --- Bildirim/Mesaj/Sepet State Yönetimi (Diğer sayfalarla aynı) ---
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [selectedNotification, setSelectedNotification] = useState<SelectedNotification | null>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedChat, setSelectedChat] = useState<Message | null>(null);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);
  const [showCartPanel, setShowCartPanel] = useState(false);

  // --- Handler Fonksiyonları (Diğer sayfalarla aynı) ---
  const handleLogout = () => { if (window.confirm("Çıkış yapmak istediğinizden emin misiniz?")) router.push('/anasayfa'); };
  const handleNotificationClick = (notification: Notification) => { setSelectedNotification(notification); setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n)); setShowNotificationsPanel(false); };
  const markAllNotificationsAsRead = (e: React.MouseEvent) => { e.preventDefault(); setNotifications(prev => prev.map(n => ({ ...n, read: true }))); };
  const handleMessageClick = (message: Message) => { setSelectedChat(message); setMessages(prev => prev.map(m => m.id === message.id ? { ...m, read: true } : m)); setShowMessagesPanel(false); };
  const markAllMessagesAsRead = (e: React.MouseEvent) => { e.preventDefault(); setMessages(prev => prev.map(m => ({ ...m, read: true }))); };
  const toggleNotificationsPanel = () => { setShowNotificationsPanel(!showNotificationsPanel); setShowMessagesPanel(false); setShowCartPanel(false); };
  const toggleMessagesPanel = () => { setShowMessagesPanel(!showMessagesPanel); setShowNotificationsPanel(false); setShowCartPanel(false); };
  const toggleCartPanel = () => { setShowCartPanel(!showCartPanel); setShowNotificationsPanel(false); setShowMessagesPanel(false); };
  const unreadNotificationCount = notifications.filter(n => !n.read).length;
  const unreadMessageCount = messages.filter(m => !m.read).length;
  // --- State Yönetimi Sonu ---

  return (
    <div className="dashboard-container">
      <Sidebar />

      <Header
        userData={pharmacyData}
        onMessageClick={toggleMessagesPanel}
        onNotificationClick={toggleNotificationsPanel}
        onCartClick={toggleCartPanel}
        unreadNotificationCount={unreadNotificationCount}
        unreadMessageCount={unreadMessageCount}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <div className={styles.pageContainer}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Raporlarım</h1>
          </div>

          <div className={styles.reportGrid}>
            {reportList.map((report) => (
              <ReportCard
                key={report.link}
                title={report.title}
                description={report.description}
                icon={report.icon}
                link={report.link}
              />
            ))}
          </div>

        </div>
      </main>

      {/* --- Panel ve Modal Alanı (Diğer sayfalarla aynı) --- */}
      <SlidePanel title="Bildirimler" show={showNotificationsPanel} onClose={() => setShowNotificationsPanel(false)} onMarkAllRead={markAllNotificationsAsRead}>
        {notifications.map(notif => <NotificationItem key={notif.id} item={notif} onClick={handleNotificationClick} />)}
      </SlidePanel>
      <SlidePanel title="Mesajlar" show={showMessagesPanel} onClose={() => setShowMessagesPanel(false)} onMarkAllRead={markAllMessagesAsRead}>
        {messages.map(msg => <MessageItem key={msg.id} item={msg} onClick={handleMessageClick} />)}
      </SlidePanel>
      <CartPanel show={showCartPanel} onClose={toggleCartPanel} />
      <NotificationModal notification={selectedNotification} onClose={() => setSelectedNotification(null)} />
      <ChatWindow chat={selectedChat} onClose={() => setSelectedChat(null)} />
    </div>
  );
}