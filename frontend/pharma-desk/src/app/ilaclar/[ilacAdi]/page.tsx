// src/app/ilaclar/[ilacAdi]/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import Header from '../../../components/Header';
import { pharmacyData, ilaclarShowroomData, initialNotifications, initialMessages, priceHistoryData, warehouseOffersData, ShowroomMedication, PriceData } from '../../../data/dashboardData';
import SlidePanel from '../../../components/ui/SlidePanel';
import NotificationItem from '../../../components/notifications/NotificationItem';
import MessageItem from '../../../components/notifications/MessageItem';
import NotificationModal from '../../../components/notifications/NotificationModal';
import ChatWindow from '../../../components/chat/ChatWindow';
import ProductCard from '../../../components/ilaclar/ProductCard';
import PriceChart from '../../../components/ilaclar/PriceChart';
import WarehouseOffers from '../../../components/ilaclar/WarehouseOffers';

import { useCart } from '../../../context/CartContext';
import CartPanel from '../../../components/cart/CartPanel';

import styles from './ilacDetay.module.css';
import '../../dashboard/dashboard.css';

// Yeni sabit: Maksimum seçilebilecek adet
const MAX_ALLOWED_QUANTITY = 1000;

// ... (QuantitySelector arayüzü ve bileşeni aynı kalır, `maxStock` prop'unu alır) ...
interface QuantitySelectorProps {
    quantity: number | string;
    onDecrement: () => void;
    onIncrement: () => void;
    onQuantityChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
    maxStock: number; // Bu prop, hesaplanmış limiti alacak
    className?: string;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({ quantity, onDecrement, onIncrement, onQuantityChange, onBlur, maxStock, className }) => (
    <div className={`${styles.quantitySelector} ${className || ''}`}>
        <button onClick={onDecrement} disabled={Number(quantity) <= 1}>-</button>
        <input
            type="number"
            value={quantity}
            onChange={onQuantityChange}
            onBlur={onBlur}
            min="1"
            max={maxStock} // GÜNCELLENDİ: Dinamik max değeri kullan
        />
        <button onClick={onIncrement} disabled={Number(quantity) >= maxStock}>+</button>
    </div>
);


// ... (OfferItemComponent arayüzü aynı kalır) ...
interface OfferItemComponentProps {
    medication: ShowroomMedication;
    seller: { pharmacyUsername: string; pharmacyName: string };
    styles: any;
    QuantitySelector: React.FC<QuantitySelectorProps>;
    maxStock: number; // Bu prop, hesaplanmış limiti alacak
}


const OfferItemComponent: React.FC<OfferItemComponentProps> = ({ medication, seller, styles, QuantitySelector, maxStock }) => {
    // DİKKAT: Buradaki 'medication' objesi, sayfanın ana 'medication' objesidir.
    // Bu nedenle 'medication.price' ve 'medication.currentStock'
    // bu satıcıya özel değil, ilacın ana bilgileridir.
    
    const [offerQuantity, setOfferQuantity] = useState<number | string>(1);
    const canBuy = medication.currentStock > 0; // Stok var mı kontrolü
    // GÜNCELLENDİ: Etkin maksimum stok hesaplaması
    const effectiveMaxStock = Math.min(medication.currentStock, MAX_ALLOWED_QUANTITY);

    const { addToCart } = useCart();
    const [isAdding, setIsAdding] = useState(false);

    // GÜNCELLENDİ: Artırma fonksiyonu yeni limiti kullanır
    const handleOfferIncrement = () => {
        const currentQuantity = Number(offerQuantity) || 0;
        setOfferQuantity(Math.min(effectiveMaxStock, currentQuantity + 1));
    };

    // GÜNCELLENDİ: Miktar değiştirme fonksiyonu yeni limiti kullanır
    const handleOfferQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '') {
            setOfferQuantity('');
            return;
        }
        const num = parseInt(value, 10);
        if (!isNaN(num)) {
            if (num > effectiveMaxStock) {
                 setOfferQuantity(effectiveMaxStock);
            } else if (num < 1) {
                setOfferQuantity(1);
            } else {
                setOfferQuantity(num);
            }
        }
    };
    
    // Azaltma ve Blur fonksiyonları aynı kalabilir (min=1 kontrolü yapıyorlar)
    const handleOfferDecrement = () => {
        const currentQuantity = Number(offerQuantity) || 1;
        setOfferQuantity(Math.max(1, currentQuantity - 1));
    };
    const handleOfferBlur = () => {
        if (offerQuantity === '' || Number(offerQuantity) < 1) {
            setOfferQuantity(1);
        } else if (Number(offerQuantity) > effectiveMaxStock) { // Ekstra kontrol
            setOfferQuantity(effectiveMaxStock);
        }
    };


    const handleOfferAddToCart = () => {
        if (!canBuy || isAdding) return;
        
        // Sepete eklerken de geçerli miktarı kontrol et
        const quantityToAdd = Math.min(Number(offerQuantity), effectiveMaxStock);
        if (quantityToAdd < 1) return; // Geçersiz miktar eklemeyi engelle

        setIsAdding(true);
        addToCart(medication, quantityToAdd, seller.pharmacyName);

        setTimeout(() => {
            setIsAdding(false);
            // İsteğe bağlı: Sepete ekledikten sonra miktarı 1'e sıfırla
            // setOfferQuantity(1); 
        }, 1000);
    };

    return (
        <div className={styles.offerItem}>
            {/* DİKKAT: Burası ilacın ana fiyatını kullanır (medication.price) */}
            <span className={styles.offerPrice}>{medication.price.toFixed(2).replace('.', ',')} ₺</span>
            <div className={styles.offerSellerInfo}>
                <span>{seller.pharmacyName}</span>
                <span className={styles.sellerLocation}>Ankara, Çankaya</span> {/* Lokasyon sabit kalmış, dinamik yapılabilir */}
            </div>
            <div className={styles.offerStock}>
                 {/* Stok bilgisini göster, örn: "50 / 1000" */}
                {medication.currentStock} {medication.bonus > 0 ? `+ ${medication.bonus}` : ''}
            </div>
            {canBuy && (
                <QuantitySelector
                    quantity={offerQuantity}
                    onDecrement={handleOfferDecrement}
                    onIncrement={handleOfferIncrement}
                    onQuantityChange={handleOfferQuantityChange}
                    onBlur={handleOfferBlur}
                    maxStock={effectiveMaxStock} // GÜNCELLENDİ: Hesaplanan limiti kullan
                    className={styles.secondaryQuantitySelector}
                />
            )}
            <button
                className={styles.buyButtonSecondary}
                disabled={!canBuy || isAdding}
                onClick={handleOfferAddToCart}
            >
                {isAdding ? 'Eklendi!' : (canBuy ? 'Sepete Ekle' : 'Stokta Yok')} {/* Metin değişti */}
            </button>
        </div>
    );
};
// //////////////////////////////////////////////////////


export default function IlacDetayPage() {
    // ... (router, params, addToCart, medication tanımlamaları aynı) ...
    const router = useRouter();
    const params = useParams();
    const { ilacAdi } = params as { ilacAdi: string };
    const { addToCart } = useCart();
    const medication = ilaclarShowroomData.find(m => m.name.toLowerCase().replace(/\s+/g, '-') === ilacAdi);


    const [mainQuantity, setMainQuantity] = useState<number | string>(1);
    const [isMainAdding, setIsMainAdding] = useState(false);

    // ... (Bildirim, Mesaj, Sepet Paneli state'leri aynı) ...
    const [notifications, setNotifications] = useState(initialNotifications);
    const [messages, setMessages] = useState(initialMessages);
    const [selectedNotification, setSelectedNotification] = useState<any>(null);
    const [selectedChat, setSelectedChat] = useState<any>(null);
    const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
    const [showMessagesPanel, setShowMessagesPanel] = useState(false);
    const [showCartPanel, setShowCartPanel] = useState(false); // Bu zaten vardı

    // ... (toggle fonksiyonları aynı) ...
    const handleLogout = () => { if (window.confirm("Çıkış yapmak istediğinizden emin misiniz?")) router.push('/anasayfa'); };
    const toggleNotificationsPanel = () => { setShowNotificationsPanel(p => !p); setShowMessagesPanel(false); setShowCartPanel(false); };
    const toggleMessagesPanel = () => { setShowMessagesPanel(p => !p); setShowNotificationsPanel(false); setShowCartPanel(false); };
    const toggleCartPanel = () => { setShowCartPanel(p => !p); setShowNotificationsPanel(false); setShowMessagesPanel(false); };

    // ... (handleNotificationClick, handleMessageClick, sayaçlar aynı) ...
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

    // GÜNCELLENDİ: Etkin maksimum stok hesaplaması
    // DİKKAT: Burası ilacın ana stoğunu kullanır (medication.currentStock).
    // İsteğiniz (Madde 3) mantık için buranın, aşağıdaki 'sellers' dizisindeki
    // tüm stokların toplamı olması gerekirdi, ancak veri yapısı buna izin vermiyor.
    const canBuy = medication.currentStock > 0;
    const effectiveMaxStock = Math.min(medication.currentStock, MAX_ALLOWED_QUANTITY);


    // GÜNCELLENDİ: Ana miktar artırma fonksiyonu
    const handleMainIncrement = () => {
        const currentQuantity = Number(mainQuantity) || 0;
        setMainQuantity(Math.min(effectiveMaxStock, currentQuantity + 1));
    };

    // GÜNCELLENDİ: Ana miktar değiştirme fonksiyonu
    const handleMainQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '') {
            setMainQuantity('');
            return;
        }
        const num = parseInt(value, 10);
        if (!isNaN(num)) {
            if (num > effectiveMaxStock) {
                setMainQuantity(effectiveMaxStock);
            } else if (num < 1) {
                setMainQuantity(1);
            } else {
                setMainQuantity(num);
            }
        }
    };
    
    // Ana azaltma ve blur fonksiyonları aynı kalabilir
     const handleMainDecrement = () => {
        const currentQuantity = Number(mainQuantity) || 1;
        setMainQuantity(Math.max(1, currentQuantity - 1));
    };
    const handleMainBlur = () => {
        if (mainQuantity === '' || Number(mainQuantity) < 1) {
             setMainQuantity(1);
        } else if (Number(mainQuantity) > effectiveMaxStock) { // Ekstra kontrol
            setMainQuantity(effectiveMaxStock);
        }
    };


    // GÜNCELLENDİ: Ana sepete ekleme fonksiyonu
    const handleMainAddToCart = () => {
        // DİKKAT: Burası, 3. Madde'deki isteğin (en ucuzdan alarak) yapılması gereken yerdir.
        // Ancak mevcut veri yapısıyla, sadece ilk satıcıyı (sellers[0]) ve
        // ilacın ana fiyatını/stoğunu kullanarak ekleme yapabilir.
        
        if (!canBuy || isMainAdding || !medication.sellers[0]) return;
        
        // Sepete eklerken de geçerli miktarı kontrol et
        const quantityToAdd = Math.min(Number(mainQuantity), effectiveMaxStock);
         if (quantityToAdd < 1) return; // Geçersiz miktar eklemeyi engelle

        setIsMainAdding(true);
        // DİKKAT: Sadece ilk satıcıdan (sellers[0]) ekleme yapılıyor.
        addToCart(medication, quantityToAdd, medication.sellers[0].pharmacyName);

        setTimeout(() => {
            setIsMainAdding(false);
             // İsteğe bağlı: Sepete ekledikten sonra miktarı 1'e sıfırla
            // setMainQuantity(1);
        }, 1000);
    };


    const similarProducts = ilaclarShowroomData.filter(m => m.id !== medication.id).slice(0, 3);

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
                    <div className={styles.productDetailGrid}>
                         {/* ... (Resim kısmı aynı) ... */}
                        <div className={styles.productImageContainer}>
                            <img src={medication.imageUrl || '/dolorex_placeholder.png'} alt={medication.name} />
                            <div className={styles.imageThumbnails}>
                                {/* Thumbnails */}
                            </div>
                        </div>

                        <div className={styles.productInfoContainer}>
                            <h1>{medication.name}</h1>
                            <p className={styles.manufacturer}>Üretici: {medication.manufacturer}</p>

                            <div className={styles.mainInfoRow}>
                                <span className={styles.mainPriceDisplay}>{medication.price.toFixed(2).replace('.', ',')} ₺</span>
                                <div className={styles.mainBuyActionGroup}>
                                    {canBuy && (
                                        <QuantitySelector
                                            quantity={mainQuantity}
                                            onDecrement={handleMainDecrement}
                                            onIncrement={handleMainIncrement}
                                            onQuantityChange={handleMainQuantityChange}
                                            onBlur={handleMainBlur}
                                            maxStock={effectiveMaxStock} // GÜNCELLENDİ
                                        />
                                    )}
                                    <button
                                        className={styles.buyButtonMain}
                                        disabled={!canBuy || isMainAdding}
                                        onClick={handleMainAddToCart}
                                    >
                                         {isMainAdding ? 'Eklendi!' : (canBuy ? 'Sepete Ekle' : 'Stokta Yok')} {/* Metin Değişti */}
                                    </button>
                                </div>
                            </div>

                            {/* Satıcı bilgisi */}
                             <div className={styles.sellerInfo}>
                                {/* ... (Satıcı linki) ... */}
                                Satıcı: <a href={`/profil/${medication.sellers[0]?.pharmacyUsername}`}>{medication.sellers[0]?.pharmacyName}</a>
                            </div>

                            {/* Grafik ve Teklif Sayısı */}
                            <div className={styles.chartAndOfferContainer}>
                                {/* ... (Grafik ve teklif sayısı aynı) ... */}
                                <div className={styles.sellerAndChart}>
                                    <div className={styles.priceChartWrapper}>
                                        <PriceChart data={priceHistoryData as PriceData[]} />
                                    </div>
                                </div>
                                <div className={styles.offerCountWrapper}>
                                    <div className={styles.offerCount}>
                                        <span>Teklif Sayısı</span>
                                        <strong>{medication.sellers.length}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Depo Teklifleri */}
                    <WarehouseOffers data={warehouseOffersData} />

                    {/* Eczane Teklifleri */}
                    <div className={styles.offersSection}>
                        <h2>Eczane İlaç Teklifleri</h2>
                        <div className={styles.offerList}>
                            {medication.sellers.map(seller => (
                                <OfferItemComponent
                                    key={seller.pharmacyUsername}
                                    medication={medication} // DİKKAT: Ana ilaç objesi (fiyat/stok)
                                    seller={seller}
                                    styles={styles}
                                    QuantitySelector={QuantitySelector}
                                    // GÜNCELLENDİ: Hesaplanan limiti ilet
                                    maxStock={Math.min(medication.currentStock, MAX_ALLOWED_QUANTITY)} 
                                />
                            ))}
                        </div>
                    </div>

                    {/* Benzer Ürünler */}
                    <div className={styles.similarProductsSection}>
                         {/* ... (Benzer ürünler aynı) ... */}
                        <h2>Benzer Ürünler</h2>
                        <div className={styles.similarProductsGrid}>
                            {similarProducts.map(med => (
                                <ProductCard key={med.id} medication={med} />
                            ))}
                        </div>
                    </div>
                </div>
            </main>

             {/* Paneller ve Modallar (Aynı kalır, CartPanel eklendi) */}
            <SlidePanel title="Bildirimler" show={showNotificationsPanel} onClose={() => setShowNotificationsPanel(false)} onMarkAllRead={() => { /* Tümünü okundu işaretle logic */ }}>
                {notifications.map(n => <NotificationItem key={n.id} item={n} onClick={handleNotificationClick} />)}
            </SlidePanel>
            <SlidePanel title="Mesajlar" show={showMessagesPanel} onClose={() => setShowMessagesPanel(false)} onMarkAllRead={() => { /* Tümünü okundu işaretle logic */ }}>
                {messages.map(m => <MessageItem key={m.id} item={m} onClick={handleMessageClick} />)}
            </SlidePanel>

            {/* Bu zaten vardı */}
            <CartPanel show={showCartPanel} onClose={toggleCartPanel} /> 

            <NotificationModal notification={selectedNotification} onClose={() => setSelectedNotification(null)} />
            <ChatWindow chat={selectedChat} onClose={() => setSelectedChat(null)} />
        </div>
    );
}