// src/app/ilaclar/[ilacAdi]/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import Header from '../../../components/Header';
// YENİ: priceHistoryData import edildi
import { pharmacyData, ilaclarShowroomData, initialNotifications, initialMessages, priceHistoryData, ShowroomMedication } from '../../../data/dashboardData';
import SlidePanel from '../../../components/ui/SlidePanel';
import NotificationItem from '../../../components/notifications/NotificationItem';
import MessageItem from '../../../components/notifications/MessageItem';
import NotificationModal from '../../../components/notifications/NotificationModal';
import ChatWindow from '../../../components/chat/ChatWindow';
import ProductCard from '../../../components/ilaclar/ProductCard';
import PriceChart from '../../../components/ilaclar/PriceChart';
import styles from './ilacDetay.module.css';
import '../../dashboard/dashboard.css';

// YENİ: QuantitySelector Bileşen Tanımı
interface QuantitySelectorProps {
    quantity: number;
    onDecrement: () => void;
    onIncrement: () => void;
    maxStock: number;
    className?: string; 
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({ quantity, onDecrement, onIncrement, maxStock, className }) => (
    <div className={`${styles.quantitySelector} ${className || ''}`}>
        <button onClick={onDecrement} disabled={quantity <= 1}>-</button>
        <input 
            type="number" 
            value={quantity} 
            readOnly 
            min="1" 
            max={maxStock}
        />
        <button onClick={onIncrement} disabled={quantity >= maxStock}>+</button>
    </div>
);


// YENİ: Offer Item Bileşen Tanımı (Listede kullanılan)
interface OfferItemComponentProps {
    medication: ShowroomMedication;
    seller: { pharmacyUsername: string; pharmacyName: string };
    styles: any; // Stil nesnesini prop olarak alıyoruz
    QuantitySelector: React.FC<QuantitySelectorProps>;
    maxStock: number;
}

const OfferItemComponent: React.FC<OfferItemComponentProps> = ({ medication, seller, styles, QuantitySelector, maxStock }) => {
    const [offerQuantity, setOfferQuantity] = useState(1);
    const canBuy = maxStock > 0;

    const handleOfferDecrement = () => {
        setOfferQuantity(prev => Math.max(1, prev - 1));
    };

    const handleOfferIncrement = () => {
        setOfferQuantity(prev => Math.min(maxStock, prev + 1));
    };

    return (
        <div className={styles.offerItem}>
            <span className={styles.offerPrice}>{medication.price.toFixed(2).replace('.', ',')} ₺</span>
            <div className={styles.offerSellerInfo}>
                <span>{seller.pharmacyName}</span>
                <span className={styles.sellerLocation}>Ankara, Çankaya</span>
            </div>
            <div className={styles.offerStock}>
                {medication.currentStock} + {medication.bonus}
            </div>
            {canBuy && (
                <QuantitySelector 
                    quantity={offerQuantity}
                    onDecrement={handleOfferDecrement}
                    onIncrement={handleOfferIncrement}
                    maxStock={maxStock}
                />
            )}
            <button className={styles.buyButtonSecondary} disabled={!canBuy}>
                Satın Al
            </button>
        </div>
    );
};
// //////////////////////////////////////////////////////


export default function IlacDetayPage() {
    // ... (state'ler ve fonksiyonlar aynı kalıyor) ...
    const router = useRouter();
    const params = useParams();
    const { ilacAdi } = params;

    const medication = ilaclarShowroomData.find(m => m.name.toLowerCase().replace(/\s+/g, '-') === ilacAdi);
    
    // YENİ: Ana Satın Alma Miktarı State'i
    const [mainQuantity, setMainQuantity] = useState(1); 
    
    const [notifications, setNotifications] = useState(initialNotifications);
    const [messages, setMessages] = useState(initialMessages);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [selectedChat, setSelectedChat] = useState(null);
    const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
    const [showMessagesPanel, setShowMessagesPanel] = useState(false);

    const handleLogout = () => { if (window.confirm("Çıkış yapmak istediğinizden emin misiniz?")) router.push('/anasayfa'); };
    const toggleNotificationsPanel = () => { setShowNotificationsPanel(p => !p); setShowMessagesPanel(false); };
    const toggleMessagesPanel = () => { setShowMessagesPanel(p => !p); setShowNotificationsPanel(false); };

    const handleNotificationClick = (notification) => {
        setSelectedNotification(notification);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
        setShowNotificationsPanel(false);
    };

    const handleMessageClick = (message) => {
        setSelectedChat(message);
        setMessages(prev => prev.map(m => m.id === message.id ? { ...m, read: true } : m));
        setShowMessagesPanel(false);
    };

    const unreadNotificationCount = notifications.filter(n => !n.read).length;
    const unreadMessageCount = messages.filter(m => !m.read).length;

    if (!medication) {
        return <div>İlaç bulunamadı.</div>;
    }
    
    // YENİ: Maksimum stok değeri
    const maxStock = medication.currentStock;
    const canBuy = maxStock > 0;

    // YENİ: Ana Miktar Değiştirme Fonksiyonları
    const handleMainDecrement = () => {
        setMainQuantity(prev => Math.max(1, prev - 1));
    };

    const handleMainIncrement = () => {
        setMainQuantity(prev => Math.min(maxStock, prev + 1));
    };
    
    const similarProducts = ilaclarShowroomData.filter(m => m.id !== medication.id).slice(0, 3);
    
    return (
        <div className="dashboard-container">
            <Sidebar />
            <Header
                userData={pharmacyData}
                onMessageClick={toggleMessagesPanel}
                onNotificationClick={toggleNotificationsPanel}
                unreadNotificationCount={unreadNotificationCount}
                unreadMessageCount={unreadMessageCount}
                onLogout={handleLogout}
            />
            <main className="main-content">
                <div className={styles.pageContainer}>
                    <div className={styles.productDetailGrid}>
                        <div className={styles.productImageContainer}>
                            <img src={medication.imageUrl || '/dolorex_placeholder.png'} alt={medication.name} />
                            <div className={styles.imageThumbnails}>
                                <div className={`${styles.thumb} ${styles.activeThumb}`}><img src={medication.imageUrl || '/dolorex_placeholder.png'} alt={`${medication.name} thumbnail 1`} /></div>
                                <div className={styles.thumb}><img src={medication.imageUrl || '/dolorex_placeholder.png'} alt={`${medication.name} thumbnail 2`} /></div>
                                <div className={styles.thumb}><img src={medication.imageUrl || '/dolorex_placeholder.png'} alt={`${medication.name} thumbnail 3`} /></div>
                            </div>
                        </div>

                        <div className={styles.productInfoContainer}>
                            <h1>{medication.name}</h1>
                            <p className={styles.manufacturer}>Üretici: {medication.manufacturer}</p>
                            <div className={styles.mainPriceInfo}>
                                <span className={styles.price}>{medication.price.toFixed(2).replace('.', ',')} ₺</span>
                                
                                {/* YENİ: Quantity Selector ve Satın Al Butonu Grubu */}
                                <div className={styles.buyActionGroup}>
                                    {canBuy && (
                                        <QuantitySelector 
                                            quantity={mainQuantity}
                                            onDecrement={handleMainDecrement}
                                            onIncrement={handleMainIncrement}
                                            maxStock={maxStock}
                                        />
                                    )}
                                    <button className={styles.buyButton} disabled={!canBuy}>
                                        {canBuy ? 'Satın Al' : 'Stokta Yok'} 
                                        {/* ÖNCE: {canBuy ? `Satın Al (${mainQuantity} Adet)` : 'Stokta Yok'} */}
                                    </button>
                                </div>
                            </div>
                            
                            <div className={styles.sellerAndStatsContainer}>
                                <div className={styles.sellerAndChart}>
                                    <div className={styles.sellerInfo}>
                                        Satıcı: <a href={`/profil/${medication.sellers[0]?.pharmacyUsername}`}>{medication.sellers[0]?.pharmacyName}</a>
                                    </div>
                                    {/* Boşluk değeri 30px'e çıkarıldı */}
                                    <PriceChart data={priceHistoryData} yAxisPadding={30} />
                                </div>
                                <div className={styles.offerCount}>
                                    <span>Teklif Sayısı</span>
                                    <strong>{medication.sellers.length}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ... (sayfanın geri kalanı aynı) ... */}
                    <div className={styles.offersSection}>
                        <h2>Eczane İlaç Teklifleri</h2>
                        <div className={styles.offerList}>
                            {medication.sellers.map(seller => (
                                <OfferItemComponent 
                                    key={seller.pharmacyUsername} 
                                    medication={medication} 
                                    seller={seller} 
                                    styles={styles} 
                                    QuantitySelector={QuantitySelector} 
                                    maxStock={medication.currentStock}
                                />
                            ))}
                        </div>
                    </div>
                    
                    <div className={styles.similarProductsSection}>
                        <h2>Benzer Ürünler</h2>
                        <div className={styles.similarProductsGrid}>
                            {similarProducts.map(med => (
                                <ProductCard key={med.id} medication={med} />
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            <SlidePanel title="Bildirimler" show={showNotificationsPanel} onClose={() => setShowNotificationsPanel(false)} onMarkAllRead={() => {}}>
                {notifications.map(n => <NotificationItem key={n.id} item={n} onClick={handleNotificationClick} />)}
            </SlidePanel>
            <SlidePanel title="Mesajlar" show={showMessagesPanel} onClose={() => setShowMessagesPanel(false)} onMarkAllRead={() => {}}>
                {messages.map(m => <MessageItem key={m.id} item={m} onClick={handleMessageClick} />)}
            </SlidePanel>
            <NotificationModal notification={selectedNotification} onClose={() => setSelectedNotification(null)} />
            <ChatWindow chat={selectedChat} onClose={() => setSelectedChat(null)} />
        </div>
    );
}