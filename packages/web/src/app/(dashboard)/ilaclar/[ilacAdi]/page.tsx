// src/app/(dashboard)/ilaclar/[ilacAdi]/page.tsx
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ilaclarShowroomData, priceHistoryData, warehouseOffersData, ShowroomMedication, PriceData, SellerInfo } from '@/data/dashboardData';
import ProductCard from '@/components/ilaclar/ProductCard';
import PriceChart from '@/components/ilaclar/PriceChart';
import WarehouseOffers from '@/components/ilaclar/WarehouseOffers';

import { useCart } from '@/context/CartContext';

import styles from './ilacDetay.module.css';
// DÜZELTME: dashboard.css yolunu (dashboard) içine al
import '@/app/(dashboard)/dashboard/dashboard.css';

const MAX_ALLOWED_QUANTITY = 1000;

// ### OPTİMİZASYON: Bileşen, ana component'in dışına taşındı ###
// Bu, her render'da yeniden oluşturulmasını engeller.
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


// ### OPTİMİZASYON: Bileşen, ana component'in dışına taşındı ###
interface OfferItemComponentProps {
    medication: ShowroomMedication;
    seller: SellerInfo;
}

// React.memo eklendi, prop'lar (medication, seller) değişmediği sürece
// bu bileşenin yeniden render olmasını engeller.
const OfferItemComponent: React.FC<OfferItemComponentProps> = React.memo(({ medication, seller }) => {
    const [offerQuantity, setOfferQuantity] = useState<number | string>(1);
    const [isAdding, setIsAdding] = useState(false);
    
    const { addToCart } = useCart();

    const canBuy = medication.currentStock > 0;
    const effectiveMaxStock = Math.min(medication.currentStock, MAX_ALLOWED_QUANTITY);

    // ### OPTİMİZASYON: useCallback ###
    const handleOfferIncrement = useCallback(() => {
        setOfferQuantity(q => {
             const currentQuantity = Number(q) || 0;
             return Math.min(effectiveMaxStock, currentQuantity + 1);
        });
    }, [effectiveMaxStock]);

    // ### OPTİMİZASYON: useCallback ###
    const handleOfferDecrement = useCallback(() => {
        setOfferQuantity(q => {
            const currentQuantity = Number(q) || 1;
            return Math.max(1, currentQuantity - 1);
        });
    }, []);

    // ### OPTİMİZASYON: useCallback ###
    const handleOfferQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
    }, [effectiveMaxStock]);
    
    // ### OPTİMİZASYON: useCallback ###
    const handleOfferBlur = useCallback(() => {
        setOfferQuantity(q => {
            if (q === '' || Number(q) < 1) {
                return 1;
            } else if (Number(q) > effectiveMaxStock) {
                return effectiveMaxStock;
            }
            return q;
        });
    }, [effectiveMaxStock]);

    // ### OPTİMİZASYON: useCallback ###
    const handleOfferAddToCart = useCallback(() => {
        if (!canBuy || isAdding) return;
        
        const quantityToAdd = Math.max(1, Math.min(Number(offerQuantity), effectiveMaxStock));

        setIsAdding(true);
        addToCart(medication, quantityToAdd, seller.pharmacyName);

        setTimeout(() => {
            setIsAdding(false);
        }, 1000);
    }, [canBuy, isAdding, offerQuantity, effectiveMaxStock, addToCart, medication, seller.pharmacyName]);

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
});

OfferItemComponent.displayName = 'OfferItemComponent'; // React.memo için displayName eklendi

// //////////////////////////////////////////////////////
// ANA SAYFA BİLEŞENİ
// //////////////////////////////////////////////////////

export default function IlacDetayPage() {
    const params = useParams();
    const { ilacAdi } = params as { ilacAdi: string };
    const { addToCart } = useCart();

    // ### OPTİMİZASYON: useMemo ###
    // 'medication' verisi, 'ilacAdi' değişmediği sürece yeniden aranmaz.
    const medication = useMemo(() => {
        return ilaclarShowroomData.find(m => m.name.toLowerCase().replace(/\s+/g, '-') === ilacAdi) || null;
    }, [ilacAdi]);

    const [mainQuantity, setMainQuantity] = useState<number | string>(1);
    const [isMainAdding, setIsMainAdding] = useState(false);

    if (!medication) {
        return <div>İlaç bulunamadı.</div>;
    }

    const canBuy = medication.currentStock > 0;
    const effectiveMaxStock = Math.min(medication.currentStock, MAX_ALLOWED_QUANTITY);
    const mainSeller = medication.sellers[0]; // Ana satıcı

    // ### OPTİMİZASYON: useCallback ###
    const handleMainIncrement = useCallback(() => {
        setMainQuantity(q => {
            const currentQuantity = Number(q) || 0;
            return Math.min(effectiveMaxStock, currentQuantity + 1);
        });
    }, [effectiveMaxStock]);

    // ### OPTİMİZASYON: useCallback ###
    const handleMainDecrement = useCallback(() => {
        setMainQuantity(q => {
            const currentQuantity = Number(q) || 1;
            return Math.max(1, currentQuantity - 1);
        });
    }, []);

    // ### OPTİMİZASYON: useCallback ###
    const handleMainQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
    }, [effectiveMaxStock]);
    
    // ### OPTİMİZASYON: useCallback ###
    const handleMainBlur = useCallback(() => {
        setMainQuantity(q => {
            if (q === '' || Number(q) < 1) {
                 return 1;
            } else if (Number(q) > effectiveMaxStock) {
                return effectiveMaxStock;
            }
            return q; // Mevcut geçerli değeri koru
        });
    }, [effectiveMaxStock]);

    // ### OPTİMİZASYON: useCallback ###
    const handleMainAddToCart = useCallback(() => {
        if (!canBuy || isMainAdding || !mainSeller) return;
        
        const quantityToAdd = Math.max(1, Math.min(Number(mainQuantity), effectiveMaxStock));

        setIsMainAdding(true);
        addToCart(medication, quantityToAdd, mainSeller.pharmacyName);

        setTimeout(() => {
            setIsMainAdding(false);
        }, 1000);
    }, [canBuy, isMainAdding, mainSeller, mainQuantity, effectiveMaxStock, addToCart, medication]);

    // ### OPTİMİZASYON: useMemo ###
    // 'similarProducts' listesi, 'medication.id' değişmediği sürece yeniden hesaplanmaz.
    const similarProducts = useMemo(() => {
         return ilaclarShowroomData.filter(m => m.id !== medication.id).slice(0, 3);
    }, [medication.id]);

    return (
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
                                disabled={!canBuy || isMainAdding || !mainSeller}
                                onClick={handleMainAddToCart}
                            >
                                 {isMainAdding ? 'Eklendi!' : (canBuy ? 'Sepete Ekle' : 'Stokta Yok')}
                            </button>
                        </div>
                    </div>

                    {mainSeller && (
                        <div className={styles.sellerInfo}>
                            Satıcı: <a href={`/profil/${mainSeller.pharmacyUsername}`}>{mainSeller.pharmacyName}</a>
                        </div>
                    )}

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
    );
}