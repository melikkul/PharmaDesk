// src/app/grubum/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
// Alias kullanıldı
import '../dashboard/dashboard.css';
import styles from './grubum.module.css'; // Yeni CSS modülü

// ANA BİLEŞENLER (Alias kullanıldı)
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import PharmacyCard from './PharmacyCard'; // Yeni Kart Bileşeni

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
  otherPharmaciesData,
  initialNotifications,
  initialMessages,
  PharmacyProfileData
} from '@/data/dashboardData';

// Tipler
type Notification = typeof initialNotifications[0];
type Message = typeof initialMessages[0];
type SelectedNotification = Notification & { detail?: string };

// İkonlar
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>;

export default function GrubumPage() {
  const router = useRouter();

  // --- Filtre State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(pharmacyData.group || 'Ankara Grubu');
  
  // Mevcut kullanıcının ait olduğu grup dışındaki eczaneleri al
  const allOtherPharmacies = [pharmacyData, ...otherPharmaciesData].filter(p => p.username !== pharmacyData.username);

  // Grup listesini ve filtrelenmiş eczaneleri hesapla
  const { availableGroups, filteredPharmacies } = useMemo(() => {
      const groups = [...new Set(allOtherPharmacies.map(p => p.group || 'Diğer').sort())];
      
      const filtered = allOtherPharmacies.filter(p => {
          const matchesGroup = (p.group || 'Diğer') === selectedGroup;
          const matchesSearch = searchTerm === '' || 
                                p.pharmacyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                p.pharmacistInCharge.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                p.district?.toLowerCase().includes(searchTerm.toLowerCase());
          return matchesGroup && matchesSearch;
      });

      return { availableGroups: groups, filteredPharmacies: filtered };
  }, [allOtherPharmacies, selectedGroup, searchTerm]);


  // --- Bildirim/Mesaj/Sepet State Yönetimi ---
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [selectedNotification, setSelectedNotification] = useState<SelectedNotification | null>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedChat, setSelectedChat] = useState<Message | null>(null);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);
  const [showCartPanel, setShowCartPanel] = useState(false);

  // --- Handler Fonksiyonları ---
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
            <h1 className={styles.pageTitle}>{selectedGroup}</h1>
            
            {/* Filtreleme Alanı */}
            <div className={styles.headerActions}>
                <div className={styles.selectWrapper}>
                    <select 
                      className={styles.actionSelect} 
                      value={selectedGroup} 
                      onChange={(e) => setSelectedGroup(e.target.value)}
                    >
                      {availableGroups.map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                </div>
                <div className={styles.searchWrapper}>
                    <SearchIcon />
                    <input 
                      type="text" 
                      placeholder="Eczane, Eczacı, İlçe Ara..."
                      className={styles.actionSearch}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
          </div>

          {/* Eczane Kartları Grid */}
          <div className={styles.pharmacyGrid}>
            {filteredPharmacies.length === 0 && (
                <div className={styles.emptyState}>
                    Bu grupta veya filtrede eczane bulunamadı.
                </div>
            )}
            {filteredPharmacies.map((pharmacy) => (
              <PharmacyCard
                key={pharmacy.username}
                pharmacy={pharmacy}
              />
            ))}
          </div>

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