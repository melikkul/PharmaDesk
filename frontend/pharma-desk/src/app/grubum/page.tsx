// src/app/grubum/page.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
// Alias kullanıldı
import '../dashboard/dashboard.css';
import styles from './grubum.module.css'; // Yeni CSS modülü
import tableStyles from '@/components/dashboard/Table.module.css'; // Ortak tablo stilleri
import filterStyles from '@/app/tekliflerim/InventoryFilter.module.css'; // Filtre stilleri için

// ANA BİLEŞENLER (Alias kullanıldı)
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
// import PharmacyCard from './PharmacyCard'; // YENİ: Artık kullanılmıyor

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
const MessageIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;

// Filtre state tipi
interface GroupFilterState {
  searchTerm: string;
  district: string;
  status: 'all' | 'positive' | 'negative';
  dateStart: string;
  dateEnd: string;
}

export default function GrubumPage() {
  const router = useRouter();

  // --- Filtre State ---
  const [filters, setFilters] = useState<GroupFilterState>({
    searchTerm: '',
    district: 'all',
    status: 'all',
    dateStart: '',
    dateEnd: '',
  });
  
  // Mevcut kullanıcının ait olduğu grup dışındaki eczaneleri al (ISTEK 8 GEREGI BU MANTIK DEVRE DISI)
  // const allOtherPharmacies = [pharmacyData, ...otherPharmaciesData].filter(p => p.username !== pharmacyData.username);
  
  // YENİ MANTIK (ISTEK 8): Sadece 'otherPharmaciesData' kullanılır
  const allOtherPharmacies = [...otherPharmaciesData];

  // İlçe listesini dinamik olarak oluştur
  const availableDistricts = useMemo(() => {
    const districts = new Set(allOtherPharmacies.map(p => p.district).filter(Boolean));
    return ['all', ...Array.from(districts).sort()];
  }, [allOtherPharmacies]);

  // Grup listesini ve filtrelenmiş eczaneleri hesapla
  const filteredPharmacies = useMemo(() => {
      
      const filtered = allOtherPharmacies.filter(p => {
          // ISTEK 8: Grup filtresi kaldırıldı
          // const matchesGroup = (p.group || 'Diğer') === selectedGroup;
          
          // Arama
          const matchesSearch = filters.searchTerm === '' || 
                                p.pharmacyName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                                p.pharmacistInCharge.toLowerCase().includes(filters.searchTerm.toLowerCase());
          
          // İlçe
          const matchesDistrict = filters.district === 'all' || p.district === filters.district;

          // Durum (Bakiye/Grup Yükü)
          const matchesStatus = filters.status === 'all' ||
                                (filters.status === 'positive' && p.grupYuku >= 0) ||
                                (filters.status === 'negative' && p.grupYuku < 0);
          
          // Tarih
          const kayitTarihi = new Date(p.kayitTarihi);
          const matchesDateStart = filters.dateStart === '' || kayitTarihi >= new Date(filters.dateStart);
          const matchesDateEnd = filters.dateEnd === '' || kayitTarihi <= new Date(filters.dateEnd);

          return matchesSearch && matchesDistrict && matchesStatus && matchesDateStart && matchesDateEnd;
      });

      return filtered;
  }, [allOtherPharmacies, filters]);


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
  
  // YENİ (ISTEK 1 & 2): PharmacyCard'dan gelen eczane verisiyle chat başlatma
  const handleStartChat = (pharmacy: PharmacyProfileData) => {
    // Eczane verisinden bir Mesaj objesi oluştur
    const chatData: Message = {
      id: 0, // ID 0 olabilir, ya da eczane ID'si
      idFromProfile: pharmacy.username, // Eczaneyi tanımak için
      sender: pharmacy.pharmacyName,
      lastMessage: `Sorumlu: ${pharmacy.pharmacistInCharge}`, // İlk mesaj olarak eczacı adı
      avatar: pharmacy.logoUrl,
      read: true // Yeni başlatıldığı için 'read' sayılır
    };
    setSelectedChat(chatData);
    setShowMessagesPanel(false); // Diğer panelleri kapat
  };
  
  const handleMessageClick = (message: Message) => { setSelectedChat(message); setMessages(prev => prev.map(m => m.id === message.id ? { ...m, read: true } : m)); setShowMessagesPanel(false); };
  const markAllMessagesAsRead = (e: React.MouseEvent) => { e.preventDefault(); setMessages(prev => prev.map(m => ({ ...m, read: true }))); };
  const toggleNotificationsPanel = () => { setShowNotificationsPanel(!showNotificationsPanel); setShowMessagesPanel(false); setShowCartPanel(false); };
  const toggleMessagesPanel = () => { setShowMessagesPanel(!showMessagesPanel); setShowNotificationsPanel(false); setShowCartPanel(false); };
  const toggleCartPanel = () => { setShowCartPanel(!showCartPanel); setShowNotificationsPanel(false); setShowMessagesPanel(false); };
  const unreadNotificationCount = notifications.filter(n => !n.read).length;
  const unreadMessageCount = messages.filter(m => !m.read).length;
  // --- State Yönetimi Sonu ---

  // YENİ: Filtre state güncelleme
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      district: 'all',
      status: 'all',
      dateStart: '',
      dateEnd: '',
    });
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
            {/* ISTEK 8: Başlık değiştirildi */}
            <h1 className={styles.pageTitle}>Grubum</h1>
          </div>

          {/* YENİ: Filtreleme Alanı (ISTEK 7) */}
          <div className={filterStyles.filterContainer} style={{ marginBottom: 0 }}>
             <div className={filterStyles.filterControls} style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr auto', gap: '10px' }}>
                {/* Eczane Arama */}
                <div className={styles.searchWrapper}>
                    <SearchIcon />
                    <input 
                      type="text" 
                      name="searchTerm"
                      placeholder="Eczane Adı Ara..."
                      className={styles.actionSearch}
                      style={{ width: '100%' }} // Genişliği ayarla
                      value={filters.searchTerm}
                      onChange={handleFilterChange}
                    />
                </div>
                {/* İlçe Filtresi */}
                <select
                  name="district"
                  value={filters.district}
                  onChange={handleFilterChange}
                  className={filterStyles.filterSelect}
                >
                  {availableDistricts.map(d => (
                    <option key={d} value={d}>{d === 'all' ? 'Tüm İlçeler' : d}</option>
                  ))}
                </select>
                {/* Durum Filtresi */}
                 <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className={filterStyles.filterSelect}
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="positive">Artıda Olanlar</option>
                  <option value="negative">Ekside Olanlar</option>
                </select>
                {/* Tarih Filtreleri */}
                 <input
                  type="date"
                  name="dateStart"
                  value={filters.dateStart}
                  onChange={handleFilterChange}
                  className={filterStyles.filterInput}
                />
                 <input
                  type="date"
                  name="dateEnd"
                  value={filters.dateEnd}
                  onChange={handleFilterChange}
                  className={filterStyles.filterInput}
                />
                <button onClick={clearFilters} className={filterStyles.clearButton}>Temizle</button>
             </div>
          </div>


          {/* YENİ: Eczane Tablosu (ISTEK 7) */}
          <div className={styles.tableContainer}>
            {filteredPharmacies.length === 0 ? (
                <div className={styles.emptyState}>
                    Bu filtrede eczane bulunamadı.
                </div>
            ) : (
              <table className={tableStyles.table}>
                <thead>
                  <tr>
                    <th>Eczane Adı</th>
                    <th>İlçe</th>
                    <th className={tableStyles.textRight}>Bakiye</th>
                    <th className={tableStyles.textRight}>Grup Yükü</th>
                    <th className={tableStyles.textRight}>Alım Sayısı</th>
                    <th className={tableStyles.textRight}>Alım Tutarı</th>
                    <th className={tableStyles.textRight}>Sistem Kazancı</th>
                    <th className={tableStyles.textRight}>Teklif Sayısı</th>
                    <th className={tableStyles.textRight}>Gönderi</th>
                    <th className={tableStyles.textRight}>Gönderi Tutarı</th>
                    <th className={tableStyles.textRight}>Gruba Kazandırdığı</th>
                    <th>Eylemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPharmacies.map((pharmacy) => (
                    <tr key={pharmacy.username}>
                      <td className={tableStyles.fontBold}>{pharmacy.pharmacyName}</td>
                      <td>{pharmacy.district}</td>
                      <td className={`${tableStyles.textRight} ${pharmacy.balance < 0 ? tableStyles.textRed : ''}`}>
                        {pharmacy.balance.toFixed(2)} ₺
                      </td>
                       <td className={`${tableStyles.textRight} ${pharmacy.grupYuku < 0 ? tableStyles.textRed : ''}`}>
                        {pharmacy.grupYuku.toFixed(2)} ₺
                      </td>
                      <td className={tableStyles.textRight}>{pharmacy.alimSayisi}</td>
                      <td className={tableStyles.textRight}>{pharmacy.alimTutari.toFixed(2)} ₺</td>
                      <td className={tableStyles.textRight}>{pharmacy.sistemKazanci.toFixed(2)} ₺</td>
                      <td className={tableStyles.textRight}>{pharmacy.teklifSayisi}</td>
                      <td className={tableStyles.textRight}>{pharmacy.gonderiAdet}</td>
                      <td className={tableStyles.textRight}>{pharmacy.gonderiTutari.toFixed(2)} ₺</td>
                      <td className={`${tableStyles.textRight} ${tableStyles.fontBold} ${pharmacy.grubaKazandirdigi < 0 ? tableStyles.textRed : tableStyles.textGreen}`}>
                        {pharmacy.grubaKazandirdigi.toFixed(2)} ₺
                      </td>
                      <td>
                        <button 
                          className={styles.cardButton} // PharmacyCard'dan alınan stil
                          onClick={() => handleStartChat(pharmacy)}
                        >
                          <MessageIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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