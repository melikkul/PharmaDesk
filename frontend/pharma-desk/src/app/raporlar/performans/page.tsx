// src/app/raporlar/performans/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Stil ve Bileşenler
import '@/app/dashboard/dashboard.css';
import styles from '../raporDetay.module.css';
import tableStyles from '@/components/dashboard/Table.module.css';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import DashboardCard from '@/components/DashboardCard';
import PriceChart from '@/components/ilaclar/PriceChart'; // Grafik için

// Panel Bileşenleri
import SlidePanel from '@/components/ui/SlidePanel';
import NotificationItem from '@/components/notifications/NotificationItem';
import MessageItem from '@/components/notifications/MessageItem';
import NotificationModal from '@/components/notifications/NotificationModal';
import ChatWindow from '@/components/chat/ChatWindow';
import CartPanel from '@/components/cart/CartPanel';

// Veriler
import {
  pharmacyData,
  initialNotifications,
  initialMessages,
  performanceReportData,
  financialSummaryData, // Örnek grafik için
  PriceData
} from '@/data/dashboardData';

// Tipler
type Notification = typeof initialNotifications[0];
type Message = typeof initialMessages[0];
type SelectedNotification = Notification & { detail?: string };

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;


export default function PerformansRaporuPage() {
  const router = useRouter();

  // --- Standart Panel State Yönetimi ---
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [selectedNotification, setSelectedNotification] = useState<SelectedNotification | null>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedChat, setSelectedChat] = useState<Message | null>(null);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);
  const [showCartPanel, setShowCartPanel] = useState(false);

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

  // Rapor verilerini hesapla (Örnek)
  const toplamGoruntulenme = performanceReportData.reduce((acc, item) => acc + item.views, 0);
  const toplamSatis = performanceReportData.reduce((acc, item) => acc + item.salesCount, 0);
  const ortDonusum = (toplamSatis / toplamGoruntulenme) * 100;

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
            <h1 className={styles.pageTitle}>Teklif Performans Raporu</h1>
            <Link href="/raporlar" className={styles.backButton}>
              <BackIcon />
              <span>Geri Dön</span>
            </Link>
          </div>

          <div className={styles.reportFilters}>
             <div className={styles.filterGroup}>
              <label htmlFor="dateRange">Tarih Aralığı</label>
              <input type="date" id="dateStart" />
            </div>
             <div className={styles.filterGroup}>
              <label htmlFor="dateEnd">&nbsp;</label>
              <input type="date" id="dateEnd" />
            </div>
          </div>

          <div className={styles.summaryContainer}>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryCardTitle}>Toplam Teklif Görüntülenme</h3>
              <p className={styles.summaryCardValue}>{toplamGoruntulenme.toLocaleString('tr-TR')}</p>
            </div>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryCardTitle}>Toplam Satış (Adet)</h3>
              <p className={styles.summaryCardValue}>{toplamSatis.toLocaleString('tr-TR')}</p>
            </div>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryCardTitle}>Ortalama Dönüşüm Oranı</h3>
              <p className={`${styles.summaryCardValue} ${styles.positive}`}>{ortDonusum.toFixed(2)}%</p>
            </div>
          </div>
          
          <div className={styles.chartContainer}>
            <h3>Günlük Satış Hacmi (TL)</h3>
            <PriceChart data={financialSummaryData.map(d => ({...d, price: d.price / 2})) as PriceData[]} />
          </div>

          <DashboardCard title="Detaylı Performans Listesi (En Çok Görüntülenenler)">
            <table className={`${tableStyles.table} ${styles.reportTable}`}>
              <thead>
                <tr>
                  <th>Ürün Adı</th>
                  <th>Stok</th>
                  <th className={tableStyles.textRight}>Fiyat</th>
                  <th className={tableStyles.textRight}>Görüntülenme</th>
                  <th className={tableStyles.textRight}>Satış (Adet)</th>
                  <th className={tableStyles.textRight}>Dönüşüm Oranı</th>
                </tr>
              </thead>
              <tbody>
                {performanceReportData.sort((a, b) => b.views - a.views).map(item => (
                  <tr key={item.id}>
                    <td>{item.productName}</td>
                    <td>{item.stock}</td>
                    <td className={`${tableStyles.textRight}`}>{item.price.toFixed(2)} ₺</td>
                    <td className={`${tableStyles.textRight} ${tableStyles.fontBold}`}>{item.views}</td>
                    <td className={tableStyles.textRight}>{item.salesCount}</td>
                    <td className={`${tableStyles.textRight} ${tableStyles.fontBold}`}>{item.conversionRate.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DashboardCard>

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