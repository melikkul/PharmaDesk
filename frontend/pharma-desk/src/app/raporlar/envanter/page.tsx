// src/app/raporlar/envanter/page.tsx
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
  envanterReportData,
  financialSummaryData, // Örnek grafik için
  PriceData
} from '@/data/dashboardData';

// Tipler
type Notification = typeof initialNotifications[0];
type Message = typeof initialMessages[0];
type SelectedNotification = Notification & { detail?: string };

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;

export default function EnvanterRaporuPage() {
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
  const toplamMaliyet = envanterReportData.reduce((acc, item) => acc + item.totalCostValue, 0);
  const toplamSatisDegeri = envanterReportData.reduce((acc, item) => acc + item.totalSalesValue, 0);
  const toplamKalem = envanterReportData.length;

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
            <h1 className={styles.pageTitle}>Envanter Değer Raporu</h1>
            <Link href="/raporlar" className={styles.backButton}>
              <BackIcon />
              <span>Geri Dön</span>
            </Link>
          </div>

          <div className={styles.reportFilters}>
             <div className={styles.filterGroup}>
              <label htmlFor="category">Kategori</label>
              <select id="category" defaultValue="">
                <option value="">Tüm Kategoriler</option>
                <option value="agri">Ağrı Kesici</option>
                <option value="ates">Ateş Düşürücü</option>
                <option value="vitamin">Vitamin</option>
              </select>
            </div>
            {/* Diğer filtreler buraya eklenebilir */}
          </div>

          <div className={styles.summaryContainer}>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryCardTitle}>Toplam Envanter (Maliyet)</h3>
              <p className={styles.summaryCardValue}>{toplamMaliyet.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            </div>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryCardTitle}>Toplam Envanter (Satış Değeri)</h3>
              <p className={`${styles.summaryCardValue}`}>{toplamSatisDegeri.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            </div>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryCardTitle}>Toplam Kalem (Çeşit)</h3>
              <p className={styles.summaryCardValue}>{toplamKalem}</p>
            </div>
          </div>
          
          {/* TODO: Buraya Pie Chart gelmeli. Şimdilik Line Chart kullanıyoruz. */}
          <div className={styles.chartContainer}>
            <h3>Aylık Toplam Envanter Değişimi (Maliyet)</h3>
            <PriceChart data={financialSummaryData.map(d => ({...d, price: d.price * 2.5})) as PriceData[]} />
          </div>

          <DashboardCard title="Detaylı Envanter Listesi">
            <table className={`${tableStyles.table} ${styles.reportTable}`}>
              <thead>
                <tr>
                  <th>Ürün Adı</th>
                  <th>Kategori</th>
                  <th>Stok (Adet+MF)</th>
                  <th className={tableStyles.textRight}>Maliyet Fiyatı</th>
                  <th className={tableStyles.textRight}>Satış Fiyatı</th>
                  <th className={tableStyles.textRight}>Toplam Maliyet</th>
                  <th className={tableStyles.textRight}>Toplam Satış Değeri</th>
                </tr>
              </thead>
              <tbody>
                {envanterReportData.map(item => (
                  <tr key={item.id}>
                    <td>{item.productName}</td>
                    <td>{item.category}</td>
                    <td>{item.stock}</td>
                    <td className={tableStyles.textRight}>{item.costPrice.toFixed(2)} ₺</td>
                    <td className={`${tableStyles.textRight} ${tableStyles.fontBold}`}>{item.price.toFixed(2)} ₺</td>
                    <td className={tableStyles.textRight}>{item.totalCostValue.toFixed(2)} ₺</td>
                    <td className={`${tableStyles.textRight} ${tableStyles.fontBold}`}>{item.totalSalesValue.toFixed(2)} ₺</td>
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