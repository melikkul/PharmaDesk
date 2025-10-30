// src/app/(dashboard)/ilaclar/[ilacAdi]/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ilaclarShowroomData, priceHistoryData, warehouseOffersData, ShowroomMedication, PriceData } from '@/data/dashboardData';
import ProductCard from '@/components/ilaclar/ProductCard';
import PriceChart from '@/components/ilaclar/PriceChart';
import WarehouseOffers from '@/components/ilaclar/WarehouseOffers';

import { useCart } from '@/context/CartContext';

import styles from './ilacDetay.module.css';
// DÜZELTME: dashboard.css yolunu (dashboard) içine al
import '@/app/(dashboard)/dashboard/dashboard.css';

// ANA BİLEŞENLER (TÜMÜ SİLİNDİ)
// BİLDİRİM & MESAJ BİLEŞENLERİ (TÜMÜ SİLİNDİ)
// Tipler (TÜMÜ SİLİNDİ)

const MAX_ALLOWED_QUANTITY = 1000;

// ... (QuantitySelector arayüzü ve bileşeni) ...
interface QuantitySelectorProps {
    quantity: number | string;
    onDecrement: () => void;
    onIncrement: () => void;
    onQuantityChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
    maxStock: number; 
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
            max={maxStock}
        />
        <button onClick={onIncrement} disabled={Number(quantity) >= maxStock}>+</button>
    </div>
);


// ... (OfferItemComponent arayüzü) ...
interface OfferItemComponentProps {
    medication: ShowroomMedication;
    seller: { pharmacyUsername: string; pharmacyName: string };
    styles: any;
    QuantitySelector: React.FC<QuantitySelectorProps>;
    maxStock: number;
}


const OfferItemComponent: React.FC<OfferItemComponentProps> = ({ medication, seller, styles, QuantitySelector, maxStock }) => {
    const [offerQuantity, setOfferQuantity] = useState<number | string>(1);
    const canBuy = medication.currentStock > 0;
    const effectiveMaxStock = Math.min(medication.currentStock, MAX_ALLOWED_QUANTITY);

    const { addToCart } = useCart();
    const [isAdding, setIsAdding] = useState(false);

    const handleOfferIncrement = () => {
        const currentQuantity = Number(offerQuantity) || 0;
        setOfferQuantity(Math.min(effectiveMaxStock, currentQuantity + 1));
    };

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
    
    const handleOfferDecrement = () => {
        const currentQuantity = Number(offerQuantity) || 1;
        setOfferQuantity(Math.max(1, currentQuantity - 1));
    };
    const handleOfferBlur = () => {
        if (offerQuantity === '' || Number(offerQuantity) < 1) {
            setOfferQuantity(1);
        } else if (Number(offerQuantity) > effectiveMaxStock) {
            setOfferQuantity(effectiveMaxStock);
        }
    };


    const handleOfferAddToCart = () => {
        if (!canBuy || isAdding) return;
        const quantityToAdd = Math.min(Number(offerQuantity), effectiveMaxStock);
        if (quantityToAdd < 1) return; 

        setIsAdding(true);
        addToCart(medication, quantityToAdd, seller.pharmacyName);

        setTimeout(() => {
            setIsAdding(false);
        }, 1000);
    };

    return (
        <div className={styles.offerItem}>
            <span className={styles.offerPrice}>{medication.price.toFixed(2).replace('.', ',')} ₺</span>
            <div className={styles.offerSellerInfo}>
                <span>{seller.pharmacyName}</span>
                <span className={styles.sellerLocation}>Ankara, Çankaya</span>
            </div>
            <div className={styles.offerStock}>
                {medication.currentStock} {medication.bonus > 0 ? `+ ${medication.bonus}` : ''}
            </div>
            {canBuy && (
                <QuantitySelector
                    quantity={offerQuantity}
                    onDecrement={handleOfferDecrement}
                    onIncrement={handleOfferIncrement}
                    onQuantityChange={handleOfferQuantityChange}
                    onBlur={handleOfferBlur}
                    maxStock={effectiveMaxStock}
                    className={styles.secondaryQuantitySelector}
                />
            )}
            <button
                className={styles.buyButtonSecondary}
                disabled={!canBuy || isAdding}
                onClick={handleOfferAddToCart}
            >
                {isAdding ? 'Eklendi!' : (canBuy ? 'Sepete Ekle' : 'Stokta Yok')}
            </button>
        </div>
    );
};
// //////////////////////////////////////////////////////


export default function IlacDetayPage() {
    const router = useRouter();
    const params = useParams();
    const { ilacAdi } = params as { ilacAdi: string };
    const { addToCart } = useCart();
    const medication = ilaclarShowroomData.find(m => m.name.toLowerCase().replace(/\s+/g, '-') === ilacAdi);

    const [mainQuantity, setMainQuantity] = useState<number | string>(1);
    const [isMainAdding, setIsMainAdding] = useState(false);

    // --- Bildirim/Mesaj/Sepet State'leri SİLİNDİ ---
    // --- Handler Fonksiyonları SİLİNDİ ---

    if (!medication) {
        return <div>İlaç bulunamadı.</div>;
    }

    const canBuy = medication.currentStock > 0;
    const effectiveMaxStock = Math.min(medication.currentStock, MAX_ALLOWED_QUANTITY);

    const handleMainIncrement = () => {
        const currentQuantity = Number(mainQuantity) || 0;
        setMainQuantity(Math.min(effectiveMaxStock, currentQuantity + 1));
    };

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
    
     const handleMainDecrement = () => {
        const currentQuantity = Number(mainQuantity) || 1;
        setMainQuantity(Math.max(1, currentQuantity - 1));
    };
    const handleMainBlur = () => {
        if (mainQuantity === '' || Number(mainQuantity) < 1) {
             setMainQuantity(1);
        } else if (Number(mainQuantity) > effectiveMaxStock) {
            setMainQuantity(effectiveMaxStock);
        }
    };


    const handleMainAddToCart = () => {
        if (!canBuy || isMainAdding || !medication.sellers[0]) return;
        
        const quantityToAdd = Math.min(Number(mainQuantity), effectiveMaxStock);
         if (quantityToAdd < 1) return; 

        setIsMainAdding(true);
        addToCart(medication, quantityToAdd, medication.sellers[0].pharmacyName);

        setTimeout(() => {
            setIsMainAdding(false);
        }, 1000);
    };


    const similarProducts = ilaclarShowroomData.filter(m => m.id !== medication.id).slice(0, 3);

    return (
        // <div className="dashboard-container"> // SİLİNDİ
        //   <Sidebar /> // SİLİNDİ
        //   <Header /> // SİLİNDİ
        //   <main className="main-content"> // SİLİNDİ
                <div className={styles.pageContainer}>
                    <div className={styles.productDetailGrid}>
                        <div className={styles.productImageContainer}>
                            <img src={medication.imageUrl || '/dolorex_placeholder.png'} alt={medication.name} />
                            <div className={styles.imageThumbnails}>
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
                                            maxStock={effectiveMaxStock}
                                        />
                                    )}
                                    <button
                                        className={styles.buyButtonMain}
                                        disabled={!canBuy || isMainAdding}
                                        onClick={handleMainAddToCart}
                                    >
                                         {isMainAdding ? 'Eklendi!' : (canBuy ? 'Sepete Ekle' : 'Stokta Yok')}
                                    </button>
                                </div>
                            </div>

                             <div className={styles.sellerInfo}>
                                Satıcı: <a href={`/profil/${medication.sellers[0]?.pharmacyUsername}`}>{medication.sellers[0]?.pharmacyName}</a>
                            </div>

                            <div className={styles.chartAndOfferContainer}>
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

                    <WarehouseOffers data={warehouseOffersData} />

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
                                    maxStock={Math.min(medication.currentStock, MAX_ALLOWED_QUANTITY)} 
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
        //   </main> // SİLİNDİ
        //   {/* --- Panel ve Modal Alanı SİLİNDİ --- */}
        // </div> // SİLİNDİ
    );
}