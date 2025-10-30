// src/app/sepet/page.tsx
'use client';

import React, { useState } from 'react'; // useState eklendi
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

// Bileşenleri import et
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import SlidePanel from '@/components/ui/SlidePanel';
import NotificationItem from '@/components/notifications/NotificationItem';
import MessageItem from '@/components/notifications/MessageItem';
import NotificationModal from '@/components/notifications/NotificationModal';
import ChatWindow from '@/components/chat/ChatWindow';
import CartPanel from '@/components/cart/CartPanel';
import SettingsCard from '@/components/settings/SettingsCard';

// Verileri import et
import { pharmacyData, initialNotifications, initialMessages } from '@/data/dashboardData';

// Stilleri import et
import '@/app/dashboard/dashboard.css';
import styles from './sepet.module.css'; // Yeni sepet stilleri
import formStyles from '@/app/ayarlar/profil/profil.module.css'; // Form stillerini ayarlar'dan al
import toggleStyles from '@/app/ayarlar/page.module.css'; // Toggle stillerini ayarlar'dan al

// Tipler
type Notification = typeof initialNotifications[0];
type Message = typeof initialMessages[0];
type SelectedNotification = Notification & { detail?: string };

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
const KARGO_UCRETI = 49.90; // Kargo ücreti sabiti

export default function SepetPage() {
  const router = useRouter();
  const { cartItems, clearCart } = useCart(); 

  // Kargo seçimi state'i
  const [usePharmaDeskShipping, setUsePharmaDeskShipping] = useState(true);

  // Toplamları hesapla
  const cartTotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const kargoUcreti = usePharmaDeskShipping ? KARGO_UCRETI : 0;
  const genelToplam = cartTotal + kargoUcreti;

  // --- Standart Panel State Yönetimi ---
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [selectedNotification, setSelectedNotification] = useState<SelectedNotification | null>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [selectedChat, setSelectedChat] = useState<Message | null>(null);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);
  const [showCartPanel, setShowCartPanel] = useState(false); // Sepet paneli state'i

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

  const handleCompleteOrder = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Sipariş tamamlandı (Genel Toplam: ${genelToplam.toFixed(2)} ₺)!`);
    clearCart();
    router.push('/dashboard');
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
        <form onSubmit={handleCompleteOrder}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Siparişi Tamamla</h1>
            <Link href="/ilaclar" className={styles.backButton}>
              <BackIcon />
              <span>Alışverişe Devam Et</span>
            </Link>
          </div>

          <div className={styles.checkoutGrid}>
            {/* Sol Sütun: Formlar */}
            <div className={styles.formColumn}>
              
              {/* Kargo Hizmeti */}
              <SettingsCard
                title="Kargo Hizmeti"
                description="Siparişiniz için PharmaDesk kargo hizmetinden yararlanmak ister misiniz?"
              >
                <div className={toggleStyles.toggleList}>
                  <div className={toggleStyles.toggleItem}>
                    <span>PharmaDesk Kargo Hizmetini Kullan ({KARGO_UCRETI.toFixed(2)} ₺)</span>
                    <label className={toggleStyles.switch}>
                      <input 
                        type="checkbox" 
                        checked={usePharmaDeskShipping} 
                        onChange={(e) => setUsePharmaDeskShipping(e.target.checked)} 
                      />
                      <span className={`${toggleStyles.slider} ${toggleStyles.round}`}></span>
                    </label>
                  </div>
                </div>
              </SettingsCard>

              {/* Teslimat Adresi (ISTEK 1 GÜNCELLEMESİ) */}
              <SettingsCard
                title="Teslimat Adresi"
                description="Siparişin teslim edileceği adres."
              >
                <div className={formStyles.formGrid}>
                  <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`}>
                    <label htmlFor="address">Adres</label>
                    <textarea 
                      id="address" 
                      rows={3} 
                      defaultValue={pharmacyData.location} // Dinamik veri
                    ></textarea>
                  </div>
                  <div className={formStyles.formGroup}>
                    <label htmlFor="city">İl</label>
                    <input 
                      type="text" 
                      id="city" 
                      defaultValue={pharmacyData.city} // Dinamik veri
                    />
                  </div>
                  <div className={formStyles.formGroup}>
                    <label htmlFor="district">İlçe</label>
                    <input 
                      type="text" 
                      id="district" 
                      defaultValue={pharmacyData.district} // Dinamik veri
                    />
                  </div>
                </div>
              </SettingsCard>

            </div>

            {/* Sağ Sütun: Sipariş Özeti (ISTEK 2 GÜNCELLEMESİ) */}
            <div className={styles.summaryColumn}>
              <SettingsCard
                title="Sipariş Özeti"
                description={`${cartItems.length} adet ürün sepetinizde.`}
                footer={
                  <button type="submit" className={styles.completeOrderButton} disabled={cartItems.length === 0}>
                    Siparişi Onayla ({genelToplam.toFixed(2)} ₺)
                  </button>
                }
              >
                <div className={styles.summaryItemList}>
                  {cartItems.length === 0 && <p>Sepetiniz boş.</p>}
                  {cartItems.map(item => (
                    <div key={`${item.product.id}-${item.sellerName}`} className={styles.summaryItem}>
                      <img src={item.product.imageUrl || '/dolorex_placeholder.png'} alt={item.product.name} />
                      <div className={styles.summaryItemDetails}>
                        <strong>{item.product.name}</strong>
                        <span>{item.quantity} x {item.product.price.toFixed(2)} ₺</span>
                        <span className={styles.summarySeller}>Satıcı: {item.sellerName}</span>
                      </div>
                      <strong className={styles.summaryItemTotal}>
                        {(item.quantity * item.product.price).toFixed(2)} ₺
                      </strong>
                    </div>
                  ))}
                </div>
                
                {/* Ara Toplam, Kargo ve Genel Toplam */}
                <div className={`${styles.summaryTotal} ${styles.summarySubtotal}`}>
                  <span>Ara Toplam</span>
                  <strong>{cartTotal.toFixed(2)} ₺</strong>
                </div>
                <div className={`${styles.summaryTotal} ${styles.summarySubtotal}`}>
                  <span>Kargo Ücreti</span>
                  <strong>{kargoUcreti.toFixed(2)} ₺</strong>
                </div>
                <div className={styles.summaryTotal}>
                  <span>Genel Toplam</span>
                  <strong className={styles.finalTotal}>{genelToplam.toFixed(2)} ₺</strong>
                </div>
              </SettingsCard>
            </div>
          </div>
        </form>
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