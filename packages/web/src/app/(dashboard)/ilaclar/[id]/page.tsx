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
    baremRemainingStock?: number; // Ortak Sipariş için kalan barem stoğu
    isJointOrder?: boolean; // Ortak Sipariş mod - sepet kontrolleri gizlenir
    isPurchaseRequest?: boolean; // Alım Talebi mod - sepet kontrolleri gizlenir
}

const OfferItemComponent: React.FC<OfferItemComponentProps> = React.memo(({ offer, showBarem = false, baremRemainingStock, isJointOrder = false, isPurchaseRequest = false }) => {
    const [offerQuantity, setOfferQuantity] = useState<number | string>(1);
    const [isAdding, setIsAdding] = useState(false);
    
    const { addToCart } = useCart();

    // Parse stock
    const stockParts = offer.stock.split('+').map((s: string) => parseInt(s.trim()) || 0);
    const currentStock = stockParts[0];
    const bonus = stockParts[1] || 0;

    const canBuy = currentStock > 0;
    // Eğer baremRemainingStock varsa (Ortak Sipariş), onu da hesaba kat
    const baseMaxStock = baremRemainingStock !== undefined 
        ? Math.min(currentStock, baremRemainingStock) 
        : currentStock;
    const effectiveMaxStock = Math.min(baseMaxStock, MAX_ALLOWED_QUANTITY);

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
                {isJointOrder ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#ea580c' }}>{currentStock} Adet</div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#78716c' }}>talep ediyor</div>
                    </div>
                ) : isPurchaseRequest ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#8b5cf6' }}>{currentStock} Adet</div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#78716c' }}>talep edildi</div>
                    </div>
                ) : (
                    <>
                        {remainingStock} Adet
                        {soldQuantity > 0 && (
                            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>
                                ({currentStock} - {soldQuantity})
                            </span>
                        )}
                    </>
                )}
            </div>
            {/* Sepet kontrolleri - Ortak Sipariş ve Alım Talebi'nde gösterme */}
            {!isJointOrder && !isPurchaseRequest && canBuyRemaining && (
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
            {!isJointOrder && !isPurchaseRequest && (
                <button
                    className={styles.buyButtonSecondary}
                    disabled={!canBuyRemaining || isAdding}
                    onClick={handleOfferAddToCart}
                >
                    {isAdding ? 'Eklendi!' : (canBuyRemaining ? 'Sepete Ekle' : 'Stokta Yok')}
                </button>
            )}
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
    
    // 🆕 Type filter from URL
    const typeFilter = searchParams.get('type'); // URL'den type parametresi (stocksale, jointorder, purchaserequest)
    
    // 🆕 Offer ID from URL - specific offer selection
    const offerId = searchParams.get('offerId'); // URL'den offerId parametresi
    
    const { offers: allOffers, loading, error } = useMedicationOffers(id);
    const { addToCart } = useCart();

    const [mainQuantity, setMainQuantity] = useState<number | string>(1);
    const [isMainAdding, setIsMainAdding] = useState(false);

    // Barem, type ve offerId'ye göre filtrele
    const offers = useMemo(() => {
        if (!allOffers.length) return allOffers;
        
        // Eğer offerId varsa, o teklifi öne al
        if (offerId) {
            const specificOffer = allOffers.find(o => String(o.id) === offerId);
            if (specificOffer) {
                // Seçilen teklifi ilk sıraya koy, diğerlerini de göster
                const otherOffers = allOffers.filter(o => 
                    String(o.id) !== offerId &&
                    ((o as any).malFazlasi || '').trim() === ((specificOffer as any).malFazlasi || '').trim() &&
                    (o.type || 'StockSale').toLowerCase() === (specificOffer.type || 'StockSale').toLowerCase()
                );
                return [specificOffer, ...otherOffers];
            }
        }
        
        return allOffers.filter(o => {
            // Barem filtresi
            const offerBarem = ((o as any).malFazlasi || '').trim();
            const baremMatch = !baremFilter || offerBarem === baremFilter;
            
            // Type filtresi
            const offerType = (o.type || 'StockSale').toLowerCase();
            const typeMatch = !typeFilter || offerType === typeFilter.toLowerCase();
            
            return baremMatch && typeMatch;
        });
    }, [allOffers, baremFilter, typeFilter, offerId]);

    // Use the first offer (cheapest) as the main display
    const mainOffer = useMemo(() => offers.length > 0 ? offers[0] : null, [offers]);

    if (loading) return <div className={styles.pageContainer}>Yükleniyor...</div>;
    if (error) return <div className={styles.pageContainer}>Hata: {error}</div>;
    if (!mainOffer) return <div className={styles.pageContainer}>İlaç bulunamadı veya aktif teklif yok.</div>;

    // Parse main offer stock
    const stockParts = mainOffer.stock.split('+').map(s => parseInt(s.trim()) || 0);
    const currentStock = stockParts[0];
    const bonus = stockParts[1] || 0;
    
    // Joint Order için kalan barem stoğunu hesapla
    let baremRemainingStock = 0;
    if (typeFilter === 'jointorder' && baremFilter) {
        const baremParts = baremFilter.split('+').map((s: string) => parseInt(s.trim()) || 0);
        const totalBaremStock = (baremParts[0] || 0) + (baremParts[1] || 0);
        const totalRequestedStock = offers.reduce((sum, o) => {
            const sParts = o.stock.split('+').map((s: string) => parseInt(s.trim()) || 0);
            return sum + (sParts[0] || 0);
        }, 0);
        baremRemainingStock = Math.max(0, totalBaremStock - totalRequestedStock);
    }
    
    // Joint Order'da max = kalan barem stoğu, diğerlerinde = mevcut stok
    const canBuy = typeFilter === 'jointorder' ? baremRemainingStock > 0 : currentStock > 0;
    const effectiveMaxStock = typeFilter === 'jointorder' 
        ? Math.min(baremRemainingStock, MAX_ALLOWED_QUANTITY)
        : Math.min(currentStock, MAX_ALLOWED_QUANTITY);

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
                    {/* 🆕 Offer Type Badge */}
                    {mainOffer.type && (
                        <div style={{
                            display: 'inline-block',
                            width: 'fit-content',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '13px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '12px',
                            backgroundColor: mainOffer.type.toLowerCase() === 'jointorder' ? '#f97316' 
                                : mainOffer.type.toLowerCase() === 'purchaserequest' ? '#6b7280' 
                                : '#10b981',
                            color: 'white',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                        }}>
                            {mainOffer.type.toLowerCase() === 'jointorder' ? 'Ortak Sipariş' 
                                : mainOffer.type.toLowerCase() === 'purchaserequest' ? 'Alım Talebi' 
                                : 'Stok Satışı'}
                        </div>
                    )}
                    
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
                    {/* Üretici kaldırıldı - tüm türler için */}
                    {/* En ucuz teklifin SKT tarihi */}
                    {mainOffer.expirationDate && (
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b' }}>
                            Son Kullanma Tarihi: <strong>{mainOffer.expirationDate}</strong>
                        </p>
                    )}

                    <div className={styles.mainInfoRow}>
                        <span className={styles.mainPriceDisplay}>{mainOffer.price.toFixed(2).replace('.', ',')} ₺</span>
                        <div className={styles.mainBuyActionGroup}>
                            {/* Stok Satışı ve JointOrder için miktar seçici */}
                            {canBuy && typeFilter !== 'purchaserequest' && (
                                <QuantitySelector
                                    quantity={mainQuantity}
                                    onDecrement={handleMainDecrement}
                                    onIncrement={handleMainIncrement}
                                    onQuantityChange={handleMainQuantityChange}
                                    onBlur={handleMainBlur}
                                    maxStock={effectiveMaxStock}
                                />
                            )}
                            {/* JointOrder için Sepete Ekle */}
                            {typeFilter === 'jointorder' && (
                                <button
                                    className={styles.buyButtonMain}
                                    style={{ backgroundColor: '#f97316' }}
                                    disabled={!canBuy || isMainAdding}
                                    onClick={handleMainAddToCart}
                                >
                                    {isMainAdding ? 'Eklendi!' : (canBuy ? 'Sepete Ekle' : 'Barem Doldu')}
                                </button>
                            )}
                            {/* PurchaseRequest için Talep Et + sayı + checkbox */}
                            {typeFilter === 'purchaserequest' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <QuantitySelector
                                            quantity={mainQuantity}
                                            onDecrement={handleMainDecrement}
                                            onIncrement={handleMainIncrement}
                                            onQuantityChange={handleMainQuantityChange}
                                            onBlur={handleMainBlur}
                                            maxStock={effectiveMaxStock}
                                        />
                                        <button
                                            className={styles.buyButtonMain}
                                            style={{ backgroundColor: '#8b5cf6' }}
                                            disabled={isMainAdding}
                                            onClick={handleMainAddToCart}
                                        >
                                            {isMainAdding ? 'Talep Edildi!' : '📦 Talep Et'}
                                        </button>
                                    </div>
                                    {/* Depo sorumlusu checkbox */}
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 12px',
                                        backgroundColor: '#ede9fe',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#5b21b6'
                                    }}>
                                        <input 
                                            type="checkbox" 
                                            style={{ width: '18px', height: '18px', accentColor: '#8b5cf6' }}
                                        />
                                        📦 Depodan ben söyleyeceğim
                                    </label>
                                </div>
                            )}
                            {/* Stok Satışı için Sepete Ekle */}
                            {typeFilter !== 'jointorder' && typeFilter !== 'purchaserequest' && (
                                <button
                                    className={styles.buyButtonMain}
                                    disabled={!canBuy || isMainAdding}
                                    onClick={handleMainAddToCart}
                                >
                                    {isMainAdding ? 'Eklendi!' : (canBuy ? 'Sepete Ekle' : 'Stokta Yok')}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={styles.sellerInfo}>
                        {typeFilter === 'jointorder' ? 'Sipariş Sorumlusu: ' : 
                         typeFilter === 'purchaserequest' ? 'Talep Eden: ' : 'Satıcı: '}
                        <Link href={`/profile/${mainOffer.pharmacyId}`}>{mainOffer.pharmacyName}</Link>
                    </div>

                    <div className={styles.chartAndOfferContainer}>
                        <div className={styles.sellerAndChart}>
                            <div className={styles.priceChartWrapper}>
                                <PriceChart data={priceHistoryData} />
                            </div>
                        </div>
                        <div className={styles.offerCountWrapper}>
                            <div className={styles.offerCount}>
                                <span>{typeFilter === 'jointorder' ? 'Talep Sayısı' : 'Teklif Sayısı'}</span>
                                <strong>{offers.length}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🆕 Barem Details Card - For Joint Order and Purchase Request */}
            {(mainOffer.type?.toLowerCase() === 'jointorder' || mainOffer.type?.toLowerCase() === 'purchaserequest') && baremFilter && (() => {
                const parts = baremFilter.split('+').map((s: string) => parseInt(s.trim()) || 0);
                const baremMin = parts[0] || 0;
                const baremBonus = parts[1] || 0;
                const totalBaremStock = baremMin + baremBonus;
                
                // Tüm tekliflerdeki talep edilen stokları topla
                const totalRequestedStock = offers.reduce((sum, o) => {
                    const stockParts = o.stock.split('+').map((s: string) => parseInt(s.trim()) || 0);
                    return sum + (stockParts[0] || 0);
                }, 0);
                
                const remainingStock = Math.max(0, totalBaremStock - totalRequestedStock);
                const usagePercent = (totalRequestedStock / totalBaremStock) * 100;
                
                return (
                    <div style={{
                        backgroundColor: '#fff7ed',
                        border: '2px solid #f97316',
                        borderRadius: '16px',
                        padding: '20px',
                        marginBottom: '24px'
                    }}>
                        <h3 style={{
                            margin: '0 0 16px 0',
                            fontSize: '16px',
                            fontWeight: '700',
                            color: '#c2410c',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            📦 Depo Barem Detayları
                        </h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                            gap: '12px'
                        }}>
                            {/* Barem Bilgisi - Tek Kutu */}
                            <div style={{
                                backgroundColor: 'white',
                                padding: '14px',
                                borderRadius: '12px',
                                textAlign: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ fontSize: '12px', color: '#78716c', marginBottom: '4px' }}>Barem</div>
                                <div style={{ fontSize: '22px', fontWeight: '700', color: '#ea580c' }}>
                                    {baremMin}+{baremBonus} = {totalBaremStock}
                                </div>
                            </div>
                            {/* Talep Edilen */}
                            <div style={{
                                backgroundColor: 'white',
                                padding: '14px',
                                borderRadius: '12px',
                                textAlign: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ fontSize: '12px', color: '#78716c', marginBottom: '4px' }}>Talep Edilen</div>
                                <div style={{ fontSize: '22px', fontWeight: '700', color: '#dc2626' }}>{totalRequestedStock} Adet</div>
                            </div>
                            {/* Kalan Adet */}
                            <div style={{
                                backgroundColor: remainingStock > 0 ? '#ecfdf5' : '#fef2f2',
                                padding: '14px',
                                borderRadius: '12px',
                                textAlign: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                border: remainingStock > 0 ? '2px solid #10b981' : '2px solid #ef4444'
                            }}>
                                <div style={{ fontSize: '12px', color: '#78716c', marginBottom: '4px' }}>Kalan Adet</div>
                                <div style={{ fontSize: '22px', fontWeight: '700', color: remainingStock > 0 ? '#10b981' : '#ef4444' }}>
                                    {remainingStock} Adet
                                </div>
                            </div>
                            {/* Birim Fiyat */}
                            <div style={{
                                backgroundColor: 'white',
                                padding: '14px',
                                borderRadius: '12px',
                                textAlign: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ fontSize: '12px', color: '#78716c', marginBottom: '4px' }}>Birim Fiyat</div>
                                <div style={{ fontSize: '22px', fontWeight: '700', color: '#7c3aed' }}>{mainOffer.price.toFixed(2)} ₺</div>
                            </div>
                        </div>
                        {/* Progress bar showing usage */}
                        <div style={{ marginTop: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                <span style={{ color: '#78716c' }}>Barem Doluluk Oranı</span>
                                <span style={{ fontWeight: '600', color: usagePercent >= 100 ? '#ef4444' : '#ea580c' }}>
                                    %{Math.min(usagePercent, 100).toFixed(0)} ({offers.length} Talep)
                                </span>
                            </div>
                            <div style={{
                                background: '#e5e5e5',
                                borderRadius: '8px',
                                height: '12px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    background: usagePercent >= 100 
                                        ? 'linear-gradient(90deg, #ef4444, #dc2626)' 
                                        : 'linear-gradient(90deg, #f97316, #ea580c)',
                                    width: `${Math.min(usagePercent, 100)}%`,
                                    height: '100%',
                                    borderRadius: '8px',
                                    transition: 'width 0.3s ease'
                                }}></div>
                            </div>
                            {remainingStock === 0 && (
                                <div style={{ 
                                    marginTop: '8px', 
                                    padding: '8px 12px', 
                                    backgroundColor: '#fef2f2', 
                                    borderRadius: '8px',
                                    color: '#dc2626',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    textAlign: 'center'
                                }}>
                                    ⚠️ Barem limiti doldu! Yeni talep kabul edilmiyor.
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            <WarehouseOffers data={warehouseOffersData} />

            <div className={styles.offersSection}>
                <h2>
                    {typeFilter === 'jointorder' ? 'İlacı Talep Edenler' : 
                     typeFilter === 'purchaserequest' ? 'İlacı Talep Edenler' : 'Eczane İlaç Teklifleri'}
                    {typeFilter && (
                        <span style={{
                            marginLeft: '12px',
                            fontSize: '14px',
                            fontWeight: '600',
                            padding: '4px 12px',
                            borderRadius: '16px',
                            backgroundColor: typeFilter === 'jointorder' ? '#f97316' : 
                                           typeFilter === 'purchaserequest' ? '#6b7280' : '#10b981',
                            color: 'white'
                        }}>
                            {typeFilter === 'jointorder' ? 'Ortak Sipariş' : 
                             typeFilter === 'purchaserequest' ? 'Alım Talebi' : 'Stok Satışı'}
                        </span>
                    )}
                </h2>
                <div className={styles.offerList}>
                    {(() => {
                        // Ortak Sipariş için kalan stok hesapla
                        let baremRemainingStock: number | undefined = undefined;
                        if (typeFilter === 'jointorder' && baremFilter) {
                            const parts = baremFilter.split('+').map((s: string) => parseInt(s.trim()) || 0);
                            const totalBaremStock = (parts[0] || 0) + (parts[1] || 0);
                            const totalRequestedStock = offers.reduce((sum, o) => {
                                const stockParts = o.stock.split('+').map((s: string) => parseInt(s.trim()) || 0);
                                return sum + (stockParts[0] || 0);
                            }, 0);
                            baremRemainingStock = Math.max(0, totalBaremStock - totalRequestedStock);
                        }
                        
                        return offers.map(offer => (
                            <OfferItemComponent
                                key={offer.id}
                                offer={offer}
                                showBarem={!baremFilter}
                                baremRemainingStock={baremRemainingStock}
                                isJointOrder={typeFilter === 'jointorder'}
                                isPurchaseRequest={typeFilter === 'purchaserequest'}
                            />
                        ));
                    })()}
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