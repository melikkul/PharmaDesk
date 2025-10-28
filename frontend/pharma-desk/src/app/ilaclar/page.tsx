// src/app/ilaclar/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { pharmacyData, ilaclarShowroomData, initialNotifications, initialMessages } from '../../data/dashboardData';
import FilterPanel from '../../components/ilaclar/FilterPanel';
import ProductCard from '../../components/ilaclar/ProductCard';
import SlidePanel from '../../components/ui/SlidePanel';
import NotificationItem from '../../components/notifications/NotificationItem';
import MessageItem from '../../components/notifications/MessageItem';
import NotificationModal from '../../components/notifications/NotificationModal';
import ChatWindow from '../../components/chat/ChatWindow';
// YENİ: CartPanel import edildi
import CartPanel from '../../components/cart/CartPanel';

import '../dashboard/dashboard.css';
import styles from './ilaclar.module.css';

// İkonlar
const FilterIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>;
const SortIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" /></svg>;

export default function IlaclarPage() {
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const router = useRouter();
    const [notifications, setNotifications] = useState(initialNotifications);
    const [messages, setMessages] = useState(initialMessages);
    
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [selectedChat, setSelectedChat] = useState(null);
    
    const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
    const [showMessagesPanel, setShowMessagesPanel] = useState(false);
    // YENİ: Sepet paneli state'i
    const [showCartPanel, setShowCartPanel] = useState(false);

    const handleLogout = () => { if (window.confirm("Çıkış yapmak istediğinizden emin misiniz?")) router.push('/anasayfa'); };
    
    const toggleNotificationsPanel = () => { 
        setShowNotificationsPanel(p => !p); 
        setShowMessagesPanel(false); 
        setShowCartPanel(false); // YENİ
    };
    const toggleMessagesPanel = () => { 
        setShowMessagesPanel(p => !p); 
        setShowNotificationsPanel(false); 
        setShowCartPanel(false); // YENİ
    };
    // YENİ: Sepet paneli toggle fonksiyonu
    const toggleCartPanel = () => {
        setShowCartPanel(p => !p);
        setShowNotificationsPanel(false);
        setShowMessagesPanel(false);
    }

    const handleNotificationClick = (notification: any) => {
        setSelectedNotification(notification); 
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
        setShowNotificationsPanel(false);
    };

    const handleMessageClick = (message: any) => {
        setSelectedChat(message); 
        setMessages(prev => prev.map(m => m.id === message.id ? { ...m, read: true } : m));
        setShowMessagesPanel(false); 
    };

    const unreadNotificationCount = notifications.filter(n => !n.read).length;
    const unreadMessageCount = messages.filter(m => !m.read).length;

    return (
        <div className="dashboard-container">
            <Sidebar />
            <Header
                userData={pharmacyData}
                onMessageClick={toggleMessagesPanel}
                onNotificationClick={toggleNotificationsPanel}
                onCartClick={toggleCartPanel} // YENİ: Prop eklendi
                unreadNotificationCount={unreadNotificationCount}
                unreadMessageCount={unreadMessageCount}
                onLogout={handleLogout}
            />
            <main className="main-content">
                <div className={styles.pageContainer}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>İlaç Vitrini</h1>
                        <div className={styles.headerActions}>
                            <div className={styles.selectWrapper}>
                                <SortIcon />
                                <select className={styles.actionSelect}>
                                    <option>Önerilen Sıralama</option>
                                    <option>Fiyat: Artan</option>
                                    <option>Fiyat: Azalan</option>
                                    <option>SKT: En Yakın</option>
                                </select>
                            </div>
                            <button className={`${styles.actionButton} ${isFilterVisible ? styles.active : ''}`} onClick={() => setIsFilterVisible(!isFilterVisible)}>
                                <FilterIcon />
                                <span>Filtrele</span>
                            </button>
                        </div>
                    </div>
                    <div className={`${styles.filterContainer} ${isFilterVisible ? styles.visible : ''}`}>
                        <FilterPanel />
                    </div>
                    <div className={styles.productGrid}>
                        {ilaclarShowroomData.map(med => (<ProductCard key={med.id} medication={med} />))}
                    </div>
                </div>
            </main>
            
            <SlidePanel title="Bildirimler" show={showNotificationsPanel} onClose={() => setShowNotificationsPanel(false)} onMarkAllRead={() => {}}>
                {notifications.map(n => <NotificationItem key={n.id} item={n} onClick={handleNotificationClick} />)}
            </SlidePanel>
            <SlidePanel title="Mesajlar" show={showMessagesPanel} onClose={() => setShowMessagesPanel(false)} onMarkAllRead={() => {}}>
                {messages.map(m => <MessageItem key={m.id} item={m} onClick={handleMessageClick} />)}
            </SlidePanel>
            
            {/* YENİ: CartPanel render edildi */}
            <CartPanel show={showCartPanel} onClose={toggleCartPanel} />

            <NotificationModal notification={selectedNotification} onClose={() => setSelectedNotification(null)} />
            <ChatWindow chat={selectedChat} onClose={() => setSelectedChat(null)} />
        </div>
    );
}