// src/app/tekliflerim/yeni/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// Alias kullanıldı
import '../../dashboard/dashboard.css';
import styles from '../tekliflerim.module.css';

// ANA BİLEŞENLER (Alias kullanıldı)
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import OfferForm from '../OfferForm'; // Bu aynı dizinde

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

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;

export default function YeniTeklifPage() {
  const router = useRouter();

  // --- Bildirim/Mesaj/Sepet State Yönetimi (Aynı kalıyor) ---
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [selectedNotification, setSelectedNotification] = useState<SelectedNotification | null>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedChat, setSelectedChat] = useState<Message | null>(null);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);
  const [showCartPanel, setShowCartPanel] = useState(false);
  // --- Form Kaydetme Durumu ---
  const [isSaving, setIsSaving] = useState(false);

  // --- Handler Fonksiyonları (Aynı kalıyor) ---
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

  // --- Form Kaydetme Fonksiyonu (Simülasyon) ---
  const handleSaveOffer = async (formData: any) => {
      setIsSaving(true);
      console.log("API Çağrısı: Yeni teklif kaydediliyor...", formData);
      // Simülasyon
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Yeni teklif başarıyla kaydedildi.");
      setIsSaving(false);
      // Başarılı kayıttan sonra tekliflerim sayfasına yönlendir
      router.push('/tekliflerim');
      // TODO: Başarı mesajı gösterilebilir (Toast notification vb.)
  };


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
            <h1 className={styles.pageTitle}>Yeni Teklif Ekle</h1>
            <Link href="/tekliflerim" className={styles.primaryButton} style={{backgroundColor: 'var(--text-secondary)'}}>
              <BackIcon />
              <span>Geri Dön</span>
            </Link>
          </div>

          {/* Formu "yeni" modda çağırıyoruz ve onSave fonksiyonunu iletiyoruz */}
          <OfferForm onSave={handleSaveOffer} isSaving={isSaving} />
        </div>
      </main>

      {/* --- Panel ve Modal Alanı (Aynı kalıyor) --- */}
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