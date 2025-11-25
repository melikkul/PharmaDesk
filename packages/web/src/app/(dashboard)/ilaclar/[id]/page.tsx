'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useMedicationOffers, OfferDto } from '@/hooks/useOffers';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import ProductCard from '@/components/ilaclar/ProductCard';
import PriceChart from '@/components/ilaclar/PriceChart';
import WarehouseOffers from '@/components/ilaclar/WarehouseOffers';
import { priceHistoryData, warehouseOffersData, ShowroomMedication } from '@/data/dashboardData';

import styles from './ilacDetay.module.css';
import '@/app/(dashboard)/dashboard/dashboard.css';

const MAX_ALLOWED_QUANTITY = 1000;

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

interface OfferItemComponentProps {
    offer: OfferDto;
}

const OfferItemComponent: React.FC<OfferItemComponentProps> = React.memo(({ offer }) => {
    const [offerQuantity, setOfferQuantity] = useState<number | string>(1);
    const [isAdding, setIsAdding] = useState(false);
    
    const { addToCart } = useCart();

    // Parse stock
    const stockParts = offer.stock.split('+').map(s => parseInt(s.trim()) || 0);
    const currentStock = stockParts[0];
    const bonus = stockParts[1] || 0;

    const canBuy = currentStock > 0;
    const effectiveMaxStock = Math.min(currentStock, MAX_ALLOWED_QUANTITY);

    const handleOfferIncrement = useCallback(() => {
        setOfferQuantity(q => {
             const currentQuantity = Number(q) || 0;
             return Math.min(effectiveMaxStock, currentQuantity + 1);
        });
    }, [effectiveMaxStock]);

    const handleOfferDecrement = useCallback(() => {
        setOfferQuantity(q => {
            const currentQuantity = Number(q) || 1;
            return Math.max(1, currentQuantity - 1);
        });
    }, []);

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

    const handleOfferAddToCart = useCallback(() => {
        if (!canBuy || isAdding) return;
        
        const quantityToAdd = Math.max(1, Math.min(Number(offerQuantity), effectiveMaxStock));

        // Map to ShowroomMedication for Cart
        const medicationForCart: ShowroomMedication = {
            id: offer.medicationId,
            name: offer.productName,
            manufacturer: offer.manufacturer || 'Bilinmiyor',
            imageUrl: offer.imageUrl || '/placeholder-med.png',
            price: offer.price,
            expirationDate: offer.expirationDate || '',
            initialStock: currentStock + bonus,
            currentStock: currentStock,
            bonus: bonus,
            sellers: [{
                pharmacyId: offer.pharmacyId,
                pharmacyName: offer.pharmacyName,
                pharmacyUsername: offer.pharmacyUsername
            }]
        };

        setIsAdding(true);
        addToCart(medicationForCart, quantityToAdd, offer.pharmacyName);

        setTimeout(() => {
            setIsAdding(false);
        }, 1000);
    }, [canBuy, isAdding, offerQuantity, effectiveMaxStock, addToCart, offer, currentStock, bonus]);

    return (
        <div className={styles.offerItem}>
            <span className={styles.offerPrice}>{offer.price.toFixed(2).replace('.', ',')} ₺</span>
            <div className={styles.offerSellerInfo}>
                <Link href={`/profile/${offer.pharmacyId}`} className={styles.sellerLink}>
                    {offer.pharmacyName}
                </Link>
                <span className={styles.sellerLocation}>Ankara, Çankaya</span>
            </div>
            <div className={styles.offerStock}>
                {currentStock} {bonus > 0 ? `+ ${bonus}` : ''}
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

OfferItemComponent.displayName = 'OfferItemComponent';

export default function IlacDetayPage() {
    const params = useParams();
    const { id } = params as { id: string };
    const { offers, loading, error } = useMedicationOffers(id);
    const { addToCart } = useCart();

    const [mainQuantity, setMainQuantity] = useState<number | string>(1);
    const [isMainAdding, setIsMainAdding] = useState(false);

    // Use the first offer (cheapest) as the main display
    const mainOffer = useMemo(() => offers.length > 0 ? offers[0] : null, [offers]);

    if (loading) return <div className={styles.pageContainer}>Yükleniyor...</div>;
    if (error) return <div className={styles.pageContainer}>Hata: {error}</div>;
    if (!mainOffer) return <div className={styles.pageContainer}>İlaç bulunamadı veya aktif teklif yok.</div>;

    // Parse main offer stock
    const stockParts = mainOffer.stock.split('+').map(s => parseInt(s.trim()) || 0);
    const currentStock = stockParts[0];
    const bonus = stockParts[1] || 0;
    const canBuy = currentStock > 0;
    const effectiveMaxStock = Math.min(currentStock, MAX_ALLOWED_QUANTITY);

    const handleMainIncrement = () => {
        setMainQuantity(q => {
            const currentQuantity = Number(q) || 0;
            return Math.min(effectiveMaxStock, currentQuantity + 1);
        });
    };

    const handleMainDecrement = () => {
        setMainQuantity(q => {
            const currentQuantity = Number(q) || 1;
            return Math.max(1, currentQuantity - 1);
        });
    };

    const handleMainQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '') {
            setMainQuantity('');
            return;
        }
        const num = parseInt(value, 10);
        if (!isNaN(num)) {
            if (num > effectiveMaxStock) setMainQuantity(effectiveMaxStock);
            else if (num < 1) setMainQuantity(1);
            else setMainQuantity(num);
        }
    };
    
    const handleMainBlur = () => {
        setMainQuantity(q => {
            if (q === '' || Number(q) < 1) return 1;
            else if (Number(q) > effectiveMaxStock) return effectiveMaxStock;
            return q;
        });
    };

    const handleMainAddToCart = () => {
        if (!canBuy || isMainAdding) return;
        
        const quantityToAdd = Math.max(1, Math.min(Number(mainQuantity), effectiveMaxStock));

        const medicationForCart: ShowroomMedication = {
            id: mainOffer.medicationId,
            name: mainOffer.productName,
            manufacturer: mainOffer.manufacturer || 'Bilinmiyor',
            imageUrl: mainOffer.imageUrl || '/placeholder-med.png',
            price: mainOffer.price,
            expirationDate: mainOffer.expirationDate || '',
            initialStock: currentStock + bonus,
            currentStock: currentStock,
            bonus: bonus,
            sellers: [{
                pharmacyId: mainOffer.pharmacyId,
                pharmacyName: mainOffer.pharmacyName,
                pharmacyUsername: mainOffer.pharmacyUsername
            }]
        };

        setIsMainAdding(true);
        addToCart(medicationForCart, quantityToAdd, mainOffer.pharmacyName);

        setTimeout(() => {
            setIsMainAdding(false);
        }, 1000);
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.productDetailGrid}>
                <div className={styles.productImageContainer}>
                    <img src={mainOffer.imageUrl || '/dolorex_placeholder.png'} alt={mainOffer.productName} />
                </div>

                <div className={styles.productInfoContainer}>
                    <h1>{mainOffer.productName}</h1>
                    <p className={styles.manufacturer}>Üretici: {mainOffer.manufacturer}</p>

                    <div className={styles.mainInfoRow}>
                        <span className={styles.mainPriceDisplay}>{mainOffer.price.toFixed(2).replace('.', ',')} ₺</span>
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
                        Satıcı: <Link href={`/profile/${mainOffer.pharmacyId}`}>{mainOffer.pharmacyName}</Link>
                    </div>

                    <div className={styles.chartAndOfferContainer}>
                        <div className={styles.sellerAndChart}>
                            <div className={styles.priceChartWrapper}>
                                <PriceChart data={priceHistoryData} />
                            </div>
                        </div>
                        <div className={styles.offerCountWrapper}>
                            <div className={styles.offerCount}>
                                <span>Teklif Sayısı</span>
                                <strong>{offers.length}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <WarehouseOffers data={warehouseOffersData} />

            <div className={styles.offersSection}>
                <h2>Eczane İlaç Teklifleri</h2>
                <div className={styles.offerList}>
                    {offers.map(offer => (
                        <OfferItemComponent
                            key={offer.id}
                            offer={offer}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}