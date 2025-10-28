// src/app/tekliflerim/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// Alias kullanıldı
import '../dashboard/dashboard.css';
import styles from './tekliflerim.module.css';

// ANA BİLEŞENLER (Alias kullanıldı)
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import InventoryTable from './InventoryTable'; // Bu aynı dizinde olduğu için relative kalabilir

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
  userMedicationsData as initialUserMedications, // Başlangıç verisi için yeniden adlandırıldı
  initialNotifications,
  initialMessages,
  MedicationItem, // Tip import edildi
  OfferStatus // Tip import edildi
} from '@/data/dashboardData';

// Tipler
type Notification = typeof initialNotifications[0];
type Message = typeof initialMessages[0];
type SelectedNotification = Notification & { detail?: string };

// İkonlar
const AddIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

export default function TekliflerimPage() {
  const router = useRouter();

  // --- Envanter State Yönetimi ---
  const [inventory, setInventory] = useState<MedicationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Yükleme durumu

  // --- Bildirim/Mesaj/Sepet State Yönetimi ---
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [selectedNotification, setSelectedNotification] = useState<SelectedNotification | null>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedChat, setSelectedChat] = useState<Message | null>(null);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);
  const [showCartPanel, setShowCartPanel] = useState(false);

  // --- Veri Yükleme (Simülasyon) ---
  useEffect(() => {
    // Normalde burada API'den veri çekilir
    console.log("Teklifler yükleniyor...");
    setTimeout(() => {
        setInventory(initialUserMedications);
        setIsLoading(false);
        console.log("Teklifler yüklendi.");
    }, 500); // 0.5 saniye gecikme ekle
  }, []);

  // --- API Çağrı Simülasyonları ---
  const handleDeleteItems = async (ids: number[]) => {
      // API'ye silme isteği gönder
      console.log(`API Çağrısı: ${ids.join(', ')} ID'li teklifler siliniyor...`);
      // Simülasyon için 0.5 saniye bekle
      await new Promise(resolve => setTimeout(resolve, 500));
      setInventory(prev => prev.filter(item => !ids.includes(item.id)));
      console.log(`${ids.length} teklif silindi.`);
      // Gerçek uygulamada hata yönetimi de olmalı
  };

  const handleUpdateStatus = async (ids: number[], status: OfferStatus) => {
      // API'ye durum güncelleme isteği gönder
      console.log(`API Çağrısı: ${ids.join(', ')} ID'li tekliflerin durumu "${status}" olarak güncelleniyor...`);
      // Simülasyon için 0.5 saniye bekle
      await new Promise(resolve => setTimeout(resolve, 500));
      setInventory(prev =>
          prev.map(item =>
              ids.includes(item.id) ? { ...item, status: status } : item
          )
      );
      console.log(`${ids.length} teklifin durumu güncellendi.`);
       // Gerçek uygulamada hata yönetimi de olmalı
  };

  // --- Diğer Handler Fonksiyonları (Aynı kalıyor) ---
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
            <h1 className={styles.pageTitle}>Tekliflerim / Envanter</h1>
            <Link href="/tekliflerim/yeni" className={styles.primaryButton}>
              <AddIcon />
              <span>Yeni Teklif Ekle</span>
            </Link>
          </div>

          {isLoading ? (
             <div style={{ textAlign: 'center', padding: '50px' }}>Teklifler yükleniyor...</div>
          ) : (
            <InventoryTable
                data={inventory}
                onDeleteItems={handleDeleteItems}
                onUpdateStatus={handleUpdateStatus}
            />
          )}
        </div>
      </main>

      {/* --- Panel ve Modal Alanı --- */}
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