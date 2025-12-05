'use client';

import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useMedicationOffers } from '@/hooks/useOffers';
import { Offer } from '@/types';
import { useCart } from '@/store/CartContext';
import Link from 'next/link';
import ProductCard from '@/components/ilaclar/ProductCard';
import PriceChart from '@/components/ilaclar/PriceChart';
import WarehouseOffers from '@/components/ilaclar/WarehouseOffers';
import { priceHistoryData, warehouseOffersData, ShowroomMedication } from '@/lib/dashboardData';

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
    offer: Offer;
    showBarem?: boolean; // Filtresiz linkte barem göster
}

const OfferItemComponent: React.FC<OfferItemComponentProps> = React.memo(({ offer, showBarem = false }) => {
    const [offerQuantity, setOfferQuantity] = useState<number | string>(1);
    const [isAdding, setIsAdding] = useState(false);
    
    const { addToCart } = useCart();

    // Parse stock
    const stockParts = offer.stock.split('+').map((s: string) => parseInt(s.trim()) || 0);
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
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 1 && numValue <= effectiveMaxStock) {
            setOfferQuantity(numValue);
        }
    }, [effectiveMaxStock]);
    
    const handleOfferBlur = useCallback(() => {
        setOfferQuantity(q => {
            const currentQuantity = Number(q) || 1;
            if (currentQuantity < 1) return 1;
            if (currentQuantity > effectiveMaxStock) return effectiveMaxStock;
            return q;
        });
    }, [effectiveMaxStock]);

    const handleOfferAddToCart = useCallback(() => {
        if (!canBuy || isAdding) return;
        
        const quantityToAdd = Math.max(1, Math.min(Number(offerQuantity), effectiveMaxStock));

        // Map to ShowroomMedication for Cart
        const medicationForCart: ShowroomMedication = {
            id: offer.medicationId,
            name: offer.productName || 'Bilinmiyor',
            manufacturer: offer.manufacturer || 'Bilinmiyor',
            imageUrl: offer.imageUrl || '/placeholder-med.png',
            price: offer.price,
            expirationDate: offer.expirationDate || '',
            initialStock: currentStock + bonus,
            currentStock: currentStock,
            bonus: bonus,
            sellers: [{
                pharmacyId: String(offer.pharmacyId),
                pharmacyName: offer.pharmacyName || 'Bilinmiyor',
                pharmacyUsername: offer.pharmacyUsername || 'bilinmiyor'
            }]
        };

        setIsAdding(true);
        addToCart(medicationForCart, quantityToAdd, offer.pharmacyName || 'Bilinmiyor');

        setTimeout(() => {
            setIsAdding(false);
        }, 1000);
    }, [canBuy, isAdding, offerQuantity, effectiveMaxStock, addToCart, offer, currentStock, bonus]);

    // Kalan stok hesapla: Stok - Satılan
    const soldQuantity = (offer as any).soldQuantity || 0;
    const remainingStock = currentStock - soldQuantity;
    const canBuyRemaining = remainingStock > 0;

    // Barem bilgisi - malFazlasi'ndan parse et
    const malFazlasi = (offer as any).malFazlasi || '0+0';
    const baremParts = malFazlasi.split('+').map((s: string) => parseInt(s.trim()) || 0);
    const baremMin = baremParts[0] || 0;
    const baremBonus = baremParts[1] || 0;
    const hasBarem = baremBonus > 0;

    return (
        <div className={styles.offerItem}>
            <span className={styles.offerPrice}>{offer.price.toFixed(2).replace('.', ',')} ₺</span>
            <div className={styles.offerSellerInfo}>
                <Link href={`/profile/${offer.pharmacyId}`} className={styles.sellerLink}>
                    {offer.pharmacyName}
                </Link>
                {/* SKT tarihi */}
                {offer.expirationDate && (
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                        SKT: {offer.expirationDate}
                    </span>
                )}
                {/* Barem bilgisi - sadece filtresiz linkte göster */}
                {showBarem && hasBarem && (
                    <span style={{
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: '600',
                        marginTop: '4px',
                        display: 'inline-block'
                    }}>
                        {baremMin}+{baremBonus}
                    </span>
                )}
            </div>
            {/* Kalan Stok: Stok - Satılan */}
            <div className={styles.offerStock}>
                {remainingStock} Adet
                {soldQuantity > 0 && (
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>
                        ({currentStock} - {soldQuantity})
                    </span>
                )}
            </div>
            {canBuyRemaining && (
                <QuantitySelector
                    quantity={offerQuantity}
                    onDecrement={handleOfferDecrement}
                    onIncrement={handleOfferIncrement}
                    onQuantityChange={handleOfferQuantityChange}
                    onBlur={handleOfferBlur}
                    maxStock={Math.min(remainingStock, MAX_ALLOWED_QUANTITY)}
                    className={styles.secondaryQuantitySelector}
                />
            )}
            <button
                className={styles.buyButtonSecondary}
                disabled={!canBuyRemaining || isAdding}
                onClick={handleOfferAddToCart}
            >
                {isAdding ? 'Eklendi!' : (canBuyRemaining ? 'Sepete Ekle' : 'Stokta Yok')}
            </button>
        </div>
    );
});

OfferItemComponent.displayName = 'OfferItemComponent';

function IlacDetayPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const { id } = params as { id: string };
    const baremFilterRaw = searchParams.get('barem'); // URL'den barem parametresi
    // URL decode - %2B -> +
    const baremFilter = baremFilterRaw ? decodeURIComponent(baremFilterRaw) : null;
    
    const { offers: allOffers, loading, error } = useMedicationOffers(id);
    const { addToCart } = useCart();

    const [mainQuantity, setMainQuantity] = useState<number | string>(1);
    const [isMainAdding, setIsMainAdding] = useState(false);

    // Barem'e göre filtrele - sadece seçilen barem tekliflerini göster
    const offers = useMemo(() => {
        if (!baremFilter || !allOffers.length) return allOffers;
        
        // Sadece seçilen bareme ait teklifleri göster
        return allOffers.filter(o => {
            const offerBarem = ((o as any).malFazlasi || '').trim();
            return offerBarem === baremFilter;
        });
    }, [allOffers, baremFilter]);

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
            name: mainOffer.productName || 'Bilinmiyor',
            manufacturer: mainOffer.manufacturer || 'Bilinmiyor',
            imageUrl: mainOffer.imageUrl || '/placeholder-med.png',
            price: mainOffer.price,
            expirationDate: mainOffer.expirationDate || '',
            initialStock: currentStock + bonus,
            currentStock: currentStock,
            bonus: bonus,
            sellers: [{
                pharmacyId: String(mainOffer.pharmacyId),
                pharmacyName: mainOffer.pharmacyName || 'Bilinmiyor',
                pharmacyUsername: mainOffer.pharmacyUsername || 'bilinmiyor'
            }]
        };

        setIsMainAdding(true);
        addToCart(medicationForCart, quantityToAdd, mainOffer.pharmacyName || 'Bilinmiyor');

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
                    {/* Başlık ve Barem yan yana */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <h1 style={{ margin: 0 }}>{mainOffer.productName}</h1>
                        {/* Barem Bilgisi - sadece filtreli linkte göster */}
                        {baremFilter && (() => {
                            const parts = baremFilter.split('+').map((s: string) => parseInt(s.trim()) || 0);
                            const baremMin = parts[0] || 0;
                            const baremBonus = parts[1] || 0;
                            if (baremBonus > 0) {
                                return (
                                    <span style={{
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        padding: '8px 16px',
                                        borderRadius: '25px',
                                        fontSize: '16px',
                                        fontWeight: '700',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                                    }}>
                                        Barem: {baremMin} + {baremBonus}
                                    </span>
                                );
                            }
                            return null;
                        })()}
                    </div>
                    <p className={styles.manufacturer}>Üretici: {mainOffer.manufacturer}</p>
                    {/* En ucuz teklifin SKT tarihi */}
                    {mainOffer.expirationDate && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                            Son Kullanma Tarihi: <strong>{mainOffer.expirationDate}</strong>
                        </p>
                    )}

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
                            showBarem={!baremFilter}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// useSearchParams için Suspense boundary
function IlacDetayPageContent() {
    return <IlacDetayPage />;
}

export default function IlacDetayPageWrapper() {
    return (
        <Suspense fallback={<div style={{ padding: '50px', textAlign: 'center' }}>Yükleniyor...</div>}>
            <IlacDetayPage />
        </Suspense>
    );
}