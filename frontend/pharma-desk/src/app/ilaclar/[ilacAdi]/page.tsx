// src/app/ilaclar/[ilacAdi]/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import Header from '../../../components/Header';
// GÜNCELLENDİ: warehouseOffersData import edildi
import { pharmacyData, ilaclarShowroomData, initialNotifications, initialMessages, priceHistoryData, warehouseOffersData, ShowroomMedication, PriceData } from '../../../data/dashboardData';
import SlidePanel from '../../../components/ui/SlidePanel';
import NotificationItem from '../../../components/notifications/NotificationItem';
import MessageItem from '../../../components/notifications/MessageItem';
import NotificationModal from '../../../components/notifications/NotificationModal';
import ChatWindow from '../../../components/chat/ChatWindow';
import ProductCard from '../../../components/ilaclar/ProductCard';
import PriceChart from '../../../components/ilaclar/PriceChart';
// YENİ EKLENDİ: WarehouseOffers bileşeni
import WarehouseOffers from '../../../components/ilaclar/WarehouseOffers';
import styles from './ilacDetay.module.css';
import '../../dashboard/dashboard.css';

// YENİ: QuantitySelector Bileşen Tanımı (Dışarıdan prop ile className alacak şekilde güncellendi)
interface QuantitySelectorProps {
    // GÜNCELLENDİ: 'quantity' artık 'string' veya 'number' olabilir
    quantity: number | string;
    onDecrement: () => void;
    onIncrement: () => void;
    // YENİ EKLENDİ: Manuel giriş için event handler'lar
    onQuantityChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
    maxStock: number;
    className?: string;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({ quantity, onDecrement, onIncrement, onQuantityChange, onBlur, maxStock, className }) => (
    <div className={`${styles.quantitySelector} ${className || ''}`}>
        <button onClick={onDecrement} disabled={Number(quantity) <= 1}>-</button>
        <input
            type="number" // Mobil'de sayısal klavye için
            value={quantity}
            // GÜNCELLENDİ: readOnly kaldırıldı, onChange ve onBlur eklendi
            onChange={onQuantityChange}
            onBlur={onBlur}
            min="1"
            max={maxStock}
        />
        <button onClick={onIncrement} disabled={Number(quantity) >= maxStock}>+</button>
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
    // GÜNCELLENDİ: State artık string veya number tutabilir
    const [offerQuantity, setOfferQuantity] = useState<number | string>(1);
    const canBuy = maxStock > 0;

    // GÜNCELLENDİ: Artırma/Azaltma fonksiyonları state'in string olabileceğini hesaba katıyor
    const handleOfferDecrement = () => {
        const currentQuantity = Number(offerQuantity) || 1;
        setOfferQuantity(Math.max(1, currentQuantity - 1));
    };

    const handleOfferIncrement = () => {
        const currentQuantity = Number(offerQuantity) || 0;
        setOfferQuantity(Math.min(maxStock, currentQuantity + 1));
    };

    // YENİ EKLENDİ: Manuel klavye girişi için handler
    const handleOfferQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '') {
            setOfferQuantity(''); // Kullanıcının alanı temizlemesine izin ver
            return;
        }
        const num = parseInt(value, 10);
        if (!isNaN(num)) {
            if (num > maxStock) {
                setOfferQuantity(maxStock);
            } else if (num < 1) {
                // Negatif veya 0 girmesini engelle (input'un min="1" özelliği bunu destekler)
                setOfferQuantity(1);
            } else {
                setOfferQuantity(num);
            }
        }
    };

    // YENİ EKLENDİ: Alan boş bırakılırsa veya geçersizse 1'e dön
    const handleOfferBlur = () => {
        if (offerQuantity === '' || Number(offerQuantity) < 1) {
            setOfferQuantity(1);
        }
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
                    // YENİ EKLENDİ: Handler'ları component'e iletiyoruz
                    onQuantityChange={handleOfferQuantityChange}
                    onBlur={handleOfferBlur}
                    maxStock={maxStock}
                    className={styles.secondaryQuantitySelector}
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
    const router = useRouter();
    const params = useParams();
    const { ilacAdi } = params as { ilacAdi: string };

    const medication = ilaclarShowroomData.find(m => m.name.toLowerCase().replace(/\s+/g, '-') === ilacAdi);

    // GÜNCELLENDİ: State artık string veya number tutabilir
    const [mainQuantity, setMainQuantity] = useState<number | string>(1);

    // Bildirim ve Mesaj State'leri
    const [notifications, setNotifications] = useState(initialNotifications);
    const [messages, setMessages] = useState(initialMessages);
    const [selectedNotification, setSelectedNotification] = useState<any>(null); // Type any for simplicity here
    const [selectedChat, setSelectedChat] = useState<any>(null); // Type any for simplicity here
    const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
    const [showMessagesPanel, setShowMessagesPanel] = useState(false);

    const handleLogout = () => { if (window.confirm("Çıkış yapmak istediğinizden emin misiniz?")) router.push('/anasayfa'); };
    const toggleNotificationsPanel = () => { setShowNotificationsPanel(p => !p); setShowMessagesPanel(false); };
    const toggleMessagesPanel = () => { setShowMessagesPanel(p => !p); setShowNotificationsPanel(false); };

    const handleNotificationClick = (notification: typeof initialNotifications[0]) => {
        setSelectedNotification(notification);
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
        setShowNotificationsPanel(false);
    };

    const handleMessageClick = (message: typeof initialMessages[0]) => {
        setSelectedChat(message);
        setMessages(prev => prev.map(m => m.id === message.id ? { ...m, read: true } : m));
        setShowMessagesPanel(false);
    };

    const unreadNotificationCount = notifications.filter(n => !n.read).length;
    const unreadMessageCount = messages.filter(m => !m.read).length;

    if (!medication) {
        return <div>İlaç bulunamadı.</div>;
    }

    // Maksimum stok değeri
    const maxStock = medication.currentStock;
    const canBuy = maxStock > 0;

    // GÜNCELLENDİ: Artırma/Azaltma fonksiyonları state'in string olabileceğini hesaba katıyor
    const handleMainDecrement = () => {
        const currentQuantity = Number(mainQuantity) || 1;
        setMainQuantity(Math.max(1, currentQuantity - 1));
    };

    const handleMainIncrement = () => {
        const currentQuantity = Number(mainQuantity) || 0;
        setMainQuantity(Math.min(maxStock, currentQuantity + 1));
    };

    // YENİ EKLENDİ: Ana miktar alanı için manuel klavye girişi handler'ı
    const handleMainQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '') {
            setMainQuantity(''); // Kullanıcının alanı temizlemesine izin ver
            return;
        }
        const num = parseInt(value, 10);
        if (!isNaN(num)) {
            if (num > maxStock) {
                setMainQuantity(maxStock);
            } else if (num < 1) {
                setMainQuantity(1);
            } else {
                setMainQuantity(num);
            }
        }
    };

    // YENİ EKLENDİ: Alan boş bırakılırsa veya geçersizse 1'e dön
    const handleMainBlur = () => {
        if (mainQuantity === '' || Number(mainQuantity) < 1) {
            setMainQuantity(1);
        }
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
                            {/* Ana Görsel */}
                            <img src={medication.imageUrl || '/dolorex_placeholder.png'} alt={medication.name} />
                            {/* Thumbnail'lar (Basitleştirilmiş) */}
                            <div className={styles.imageThumbnails}>
                                <div className={`${styles.thumb} ${styles.activeThumb}`}><img src={medication.imageUrl || '/dolorex_placeholder.png'} alt={`${medication.name} thumbnail 1`} /></div>
                                <div className={styles.thumb}><img src={medication.imageUrl || '/dolorex_placeholder.png'} alt={`${medication.name} thumbnail 2`} /></div>
                                <div className={styles.thumb}><img src={medication.imageUrl || '/dolorex_placeholder.png'} alt={`${medication.name} thumbnail 3`} /></div>
                            </div>
                        </div>

                        <div className={styles.productInfoContainer}>
                            <h1>{medication.name}</h1>
                            <p className={styles.manufacturer}>Üretici: {medication.manufacturer}</p>

                            {/* GÖRSELDEKİ ANA BİLGİ SATIRI */}
                            <div className={styles.mainInfoRow}>
                                <span className={styles.mainPriceDisplay}>{medication.price.toFixed(2).replace('.', ',')} ₺</span>
                                <div className={styles.mainBuyActionGroup}>
                                    {canBuy && (
                                        <QuantitySelector
                                            quantity={mainQuantity}
                                            onDecrement={handleMainDecrement}
                                            onIncrement={handleMainIncrement}
                                            // YENİ EKLENDİ: Handler'ları component'e iletiyoruz
                                            onQuantityChange={handleMainQuantityChange}
                                            onBlur={handleMainBlur}
                                            maxStock={maxStock}
                                        />
                                    )}
                                    <button className={styles.buyButtonMain} disabled={!canBuy}>
                                        {canBuy ? 'Satın Al' : 'Stokta Yok'}
                                    </button>
                                </div>
                            </div>

                            {/* --- SATICI BİLGİSİ BURAYA TAŞINDI --- */}
                            <div className={styles.sellerInfo} /* style={{ marginTop: '15px' }} kaldırıldı */ >
                                Satıcı: <a href={`/profil/${medication.sellers[0]?.pharmacyUsername}`}>{medication.sellers[0]?.pharmacyName}</a>
                            </div>
                            {/* --- TAŞIMA İŞLEMİ BİTTİ --- */}


                            {/* .sellerAndStatsContainer -> .chartAndOfferContainer olarak yeniden adlandırıldı */}
                            <div className={styles.chartAndOfferContainer}>

                                {/* 1. Bölüm: Grafik */}
                                <div className={styles.sellerAndChart}>
                                     <div className={styles.priceChartWrapper}>
                                        <PriceChart data={priceHistoryData as PriceData[]} />
                                    </div>
                                    {/* Satıcı bilgisi buradan kaldırıldı */}
                                </div>

                                {/* 2. Bölüm: Teklif Sayısı (Yeni sarmalayıcı eklendi) */}
                                <div className={styles.offerCountWrapper}>
                                    <div className={styles.offerCount}>
                                        <span>Teklif Sayısı</span>
                                        <strong>{medication.sellers.length}</strong>
                                    </div>
                                </div>

                            </div>

                        </div>
                    </div>

                    {/* YENİ EKLENEN BÖLÜM: ECZA DEPOSU TEKLİFLERİ (Component olarak) */}
                    <WarehouseOffers data={warehouseOffersData} />
                    {/* ///////////////////////////////////////////// */}

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