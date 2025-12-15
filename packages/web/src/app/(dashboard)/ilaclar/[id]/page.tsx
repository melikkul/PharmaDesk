'use client';

import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useMedicationOffers } from '@/hooks/useOffers';
import { Offer } from '@/types';
import { useCart } from '@/store/CartContext';
import { useSignalR } from '@/store/SignalRContext';
import Link from 'next/link';
import ProductCard from '@/components/ilaclar/ProductCard';
import PriceChart from '@/components/ilaclar/PriceChart';
import WarehouseOffers from '@/components/ilaclar/WarehouseOffers';
import { ShowroomMedication, warehouseBaremsData, warehouseOffersData, WarehouseOffer } from '@/lib/dashboardData';

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
            offerId: offer.id, // Backend offer ID for cart API
            name: offer.productName || 'Bilinmiyor',
            manufacturer: offer.manufacturer || 'Bilinmiyor',
            imageUrl: offer.imageUrl?.startsWith('/images/') ? `${''}${offer.imageUrl}` : (offer.imageUrl || '/logoYesil.png'),
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

    // Kalan stok hesapla - Ortak Sipariş ve Alım Talebi için barem bazlı
    const soldQuantity = (offer as any).soldQuantity || 0;
    // 🆕 Backend'den gelen remainingStock'u kullan (barem bazlı hesaplanmış)
    // Eğer yoksa, barem toplamı - stock - soldQuantity formülünü kullan
    let remainingStock: number;
    if ((offer as any).remainingStock !== undefined) {
        remainingStock = (offer as any).remainingStock;
    } else if (isJointOrder || isPurchaseRequest) {
        // Barem bazlı hesapla: BaremTotal - Stock - SoldQuantity
        const malFazlasiVal = (offer as any).malFazlasi || '0+0';
        const baremPartsParsed = malFazlasiVal.split('+').map((s: string) => parseInt(s.trim()) || 0);
        const baremTotal = baremPartsParsed.reduce((a: number, b: number) => a + b, 0);
        remainingStock = baremTotal - currentStock - soldQuantity;
    } else {
        remainingStock = currentStock - soldQuantity;
    }
    const canBuyRemaining = remainingStock > 0;

    // Barem bilgisi - malFazlasi'ndan parse et
    const malFazlasi = (offer as any).malFazlasi || '0+0';
    const baremParts = malFazlasi.split('+').map((s: string) => parseInt(s.trim()) || 0);
    const baremMin = baremParts[0] || 0;
    const baremBonus = baremParts[1] || 0;
    const hasBarem = baremBonus > 0;

    return (
        <div className={styles.offerItem} style={isJointOrder ? {
            backgroundColor: '#ecfdf5',
            border: '2px solid #10b981'
        } : undefined}>
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
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#78716c' }}>katkı miktarı</div>
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
    
    const { offers: allOffers, loading, error, refetch } = useMedicationOffers(id);
    const { connection } = useSignalR();
    
    // 🆕 Stock lock status state
    const [othersLockedQuantity, setOthersLockedQuantity] = useState<number>(0);
    const currentOfferId = offerId ? parseInt(offerId) : null;
    
    // 🆕 Fetch lock status for current offer
    const fetchLockStatus = useCallback(async () => {
        console.log('[IlacDetay] fetchLockStatus called, currentOfferId:', currentOfferId);
        if (!currentOfferId) {
            console.log('[IlacDetay] No currentOfferId, skipping lock status fetch');
            return;
        }
        
        try {
            const API_BASE_URL = '';
            console.log('[IlacDetay] Fetching lock status from:', `${API_BASE_URL}/api/stocklocks/offer/${currentOfferId}`);
            
            const response = await fetch(`${API_BASE_URL}/api/stocklocks/offer/${currentOfferId}`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            console.log('[IlacDetay] Lock status response:', response.status, response.ok);
            
            if (response.ok) {
                const data = await response.json();
                setOthersLockedQuantity(data.othersLocked || 0);
                console.log('[IlacDetay] Lock status for offer', currentOfferId, ':', data);
            } else {
                console.log('[IlacDetay] Lock status fetch failed:', response.status);
            }
        } catch (err) {
            console.error('[IlacDetay] Failed to fetch lock status:', err);
        }
    }, [currentOfferId]);
    
    // Fetch lock status on mount and when offerId changes
    React.useEffect(() => {
        fetchLockStatus();
    }, [fetchLockStatus]);

    // Real-time updates listener
    React.useEffect(() => {
        if (!connection) return;

        const handleUpdate = () => {
            // Refetch offers when notification received
            refetch();
        };
        
        // 🆕 Handle stock lock updates in real-time
        const handleStockLockUpdate = (data: { type: string; offerIds: number[]; pharmacyId: number }) => {
            console.log('[IlacDetay] ReceiveStockLockUpdate:', data);
            // If current offer is affected, refresh lock status
            if (currentOfferId && data.offerIds.includes(currentOfferId)) {
                fetchLockStatus();
            }
        };

        // Listen for general notifications and specific stock updates
        connection.on("ReceiveNotification", handleUpdate);
        connection.on("ReceiveStockUpdate", handleUpdate); // In case backend uses this specific event
        connection.on("ReceiveOfferUpdate", handleUpdate);
        connection.on("ReceiveStockLockUpdate", handleStockLockUpdate); // 🆕 Stock lock updates

        return () => {
            connection.off("ReceiveNotification", handleUpdate);
            connection.off("ReceiveStockUpdate", handleUpdate);
            connection.off("ReceiveOfferUpdate", handleUpdate);
            connection.off("ReceiveStockLockUpdate", handleStockLockUpdate);
        };
    }, [connection, refetch, currentOfferId, fetchLockStatus]);
    
    const { addToCart, cartItems } = useCart();

    const [mainQuantity, setMainQuantity] = useState<number | string>(1);
    const [isMainAdding, setIsMainAdding] = useState(false);
    const [cartWarning, setCartWarning] = useState<string | null>(null);
    const [isDepotSelfOrder, setIsDepotSelfOrder] = useState(false); // Depodan ben söyleyeceğim
    const [selectedImageIndex, setSelectedImageIndex] = useState(0); // Gallery için seçili görsel index

    // Helper function: Generate possible image paths from first image path
    // e.g., "images/24/1.png" -> ["images/24/1.png", "images/24/2.png", ...]
    const generateImagePaths = (imagePath: string | null | undefined): string[] => {
        if (!imagePath) return [];
        
        // Extract base path and extension
        const match = imagePath.match(/^(.*\/)(\d+)(\.[a-z]+)$/i);
        if (!match) return [imagePath];
        
        const [, basePath, , ext] = match;
        const paths: string[] = [];
        
        // Generate paths for 1-4 images
        for (let i = 1; i <= 4; i++) {
            paths.push(`${basePath}${i}${ext}`);
        }
        
        return paths;
    };

    // Get all possible image paths for current medication - moved after mainOffer declaration
    // const allImagePaths = useMemo(...) - defined below after mainOffer

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

    // Get all possible image paths for current medication
    const allImagePaths = useMemo(() => {
        if (!mainOffer?.imageUrl) return [];
        // Extract base path and extension, generate 1-4
        const imagePath = mainOffer.imageUrl.replace(/^\/?/, '');
        const match = imagePath.match(/^(.*\/)(\d+)(\.[a-z]+)$/i);
        if (!match) return [imagePath];
        
        const [, basePath, , ext] = match;
        const paths: string[] = [];
        for (let i = 1; i <= 4; i++) {
            paths.push(`${basePath}${i}${ext}`);
        }
        return paths;
    }, [mainOffer?.imageUrl]);

    if (loading) return <div className={styles.pageContainer}>Yükleniyor...</div>;
    if (error) return <div className={styles.pageContainer}>Hata: {error}</div>;
    if (!mainOffer) return <div className={styles.pageContainer}>İlaç bulunamadı veya aktif teklif yok.</div>;

    // Parse main offer stock
    const stockParts = mainOffer.stock.split('+').map(s => parseInt(s.trim()) || 0);
    const currentStock = stockParts[0];
    const bonus = stockParts[1] || 0;
    
    // Joint Order ve PurchaseRequest için kalan barem stoğunu hesapla
    let baremRemainingStock = 0;
    if ((typeFilter === 'jointorder' || typeFilter === 'purchaserequest') && baremFilter) {
        const baremParts = baremFilter.split('+').map((s: string) => parseInt(s.trim()) || 0);
        const singleBaremTotal = (baremParts[0] || 0) + (baremParts[1] || 0);
        const totalRequestedStock = offers.reduce((sum, o) => {
            const sParts = o.stock.split('+').map((s: string) => parseInt(s.trim()) || 0);
            const organizerStock = sParts[0] || 0;
            const sold = (o as any).soldQuantity || 0;
            return sum + organizerStock + sold;
        }, 0);
        
        // 🆕 Barem katını hesapla: toplam talep / tek barem = kaç kat gerekli
        const baremMultiple = Math.max(1, Math.ceil(totalRequestedStock / singleBaremTotal));
        const effectiveBaremTotal = singleBaremTotal * baremMultiple;
        
        // 🆕 Kalan stok: efektif barem toplamı - toplam talep (asla negatif olmaz)
        baremRemainingStock = Math.max(0, effectiveBaremTotal - totalRequestedStock);
    }
    
    // Joint Order ve PurchaseRequest'de max = kalan barem stoğu, diğerlerinde = mevcut stok
    // 🆕 Başka kullanıcıların kilitlediği miktarı düş
    const baseMaxStock = (typeFilter === 'jointorder' || typeFilter === 'purchaserequest') 
        ? baremRemainingStock 
        : currentStock;
    
    // 🆕 Kilitli stok düşüldükten sonra kalan miktar
    const availableAfterLocks = Math.max(0, baseMaxStock - othersLockedQuantity);
    
    // 🆕 Kullanıcının sepetindeki bu teklif için miktar
    const alreadyInCart = cartItems.find(
        item => item.offerId === currentOfferId
    )?.quantity || 0;
    
    // 🆕 Daha ne kadar eklenebilir = mevcut - sepetteki
    const canAddMore = Math.max(0, availableAfterLocks - alreadyInCart);
    
    const canBuy = canAddMore > 0;
    const effectiveMaxStock = Math.min(canAddMore, MAX_ALLOWED_QUANTITY);

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
        
        // PurchaseRequest ve JointOrder için currentStock = kalan barem stoğu (effectiveMaxStock)
        // Böylece CartContext'teki limit kontrolü doğru çalışır
        const stockForCart = (typeFilter === 'jointorder' || typeFilter === 'purchaserequest') 
            ? effectiveMaxStock 
            : currentStock;

        // Sepetteki mevcut miktarı kontrol et
        const existingCartItem = cartItems.find(
            item => item.product.id === mainOffer.medicationId && 
                    item.sellerName === (mainOffer.pharmacyName || 'Bilinmiyor')
        );
        const currentCartQuantity = existingCartItem?.quantity || 0;
        const remainingAddable = stockForCart - currentCartQuantity;

        // Tüm stok zaten sepetteyse uyarı göster
        if (remainingAddable <= 0) {
            const warningMsg = typeFilter === 'purchaserequest' 
                ? '⚠️ Tüm talep zaten sepetinizde!' 
                : typeFilter === 'jointorder'
                    ? '⚠️ Tüm sipariş zaten sepetinizde!'
                    : '⚠️ Tüm stok zaten sepetinizde!';
            setCartWarning(warningMsg);
            setTimeout(() => setCartWarning(null), 3000);
            return;
        }

        const quantityToAdd = Math.max(1, Math.min(Number(mainQuantity), remainingAddable));

        const medicationForCart: ShowroomMedication = {
            id: mainOffer.medicationId,
            offerId: mainOffer.id, // Backend offer ID for cart API
            name: mainOffer.productName || 'Bilinmiyor',
            manufacturer: mainOffer.manufacturer || 'Bilinmiyor',
            imageUrl: mainOffer.imageUrl?.startsWith('/images/') ? `${''}${mainOffer.imageUrl}` : (mainOffer.imageUrl || '/logoYesil.png'),
            price: mainOffer.price,
            expirationDate: mainOffer.expirationDate || '',
            initialStock: stockForCart + bonus,
            currentStock: stockForCart,
            bonus: bonus,
            sellers: [{
                pharmacyId: String(mainOffer.pharmacyId),
                pharmacyName: mainOffer.pharmacyName || 'Bilinmiyor',
                pharmacyUsername: mainOffer.pharmacyUsername || 'bilinmiyor'
            }]
        };

        setIsMainAdding(true);
        setCartWarning(null);
        
        // PurchaseRequest için isDepotSelfOrder bayrağını gönder
        const depotFlag = typeFilter === 'purchaserequest' ? isDepotSelfOrder : undefined;
        // Teklif türünü de gönder (stocksale varsayılan)
        const offerType = typeFilter || 'stocksale';
        addToCart(medicationForCart, quantityToAdd, mainOffer.pharmacyName || 'Bilinmiyor', depotFlag, offerType);

        // Eklenen miktarı ve depo bilgisini göster
        let successMsg = typeFilter === 'purchaserequest' 
            ? `✅ ${quantityToAdd} adet talep sepete eklendi!` 
            : `✅ ${quantityToAdd} adet sepete eklendi!`;
        
        if (typeFilter === 'purchaserequest' && isDepotSelfOrder) {
            successMsg += ' 📦 Depodan siz söyleyeceksiniz.';
        }
        setCartWarning(successMsg);

        setTimeout(() => {
            setIsMainAdding(false);
            setCartWarning(null);
        }, 2500);
    };

    return (
        <div className={styles.pageContainer}>
            {/* Toast Bildirimi - Sağ Üst Köşe */}
            {cartWarning && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    zIndex: 9999,
                    padding: '14px 24px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    backgroundColor: cartWarning.startsWith('⚠️') ? '#fef3c7' : '#dcfce7',
                    color: cartWarning.startsWith('⚠️') ? '#b45309' : '#166534',
                    border: cartWarning.startsWith('⚠️') ? '2px solid #f59e0b' : '2px solid #22c55e',
                    animation: 'slideInRight 0.4s ease-out',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    maxWidth: '350px'
                }}>
                    {cartWarning}
                </div>
            )}
            {/* Slide Animation Keyframes */}
            <style jsx>{`
                @keyframes slideInRight {
                    0% {
                        transform: translateX(120%);
                        opacity: 0;
                    }
                    100% {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
            <div className={styles.productDetailGrid}>
                <div className={styles.productImageContainer}>
                    {/* Ana Görsel */}
                    <img 
                        src={allImagePaths.length > 0 
                            ? `${''}/${allImagePaths[selectedImageIndex] || allImagePaths[0]}`
                            : (mainOffer.imageUrl?.startsWith('/images/') 
                                ? `${''}${mainOffer.imageUrl}`
                                : '/logoYesil.png')
                        }
                        alt={mainOffer.productName}
                        onError={(e) => {
                            // If image fails, try next one or fallback
                            const img = e.currentTarget;
                            if (selectedImageIndex < allImagePaths.length - 1) {
                                setSelectedImageIndex(prev => prev + 1);
                            } else {
                                img.src = '/logoYesil.png';
                            }
                        }}
                    />
                    {/* Thumbnail Görseller */}
                    {allImagePaths.length > 1 && (
                        <div className={styles.imageThumbnails}>
                            {allImagePaths.map((path, index) => (
                                <div 
                                    key={index}
                                    className={`${styles.thumb} ${selectedImageIndex === index ? styles.activeThumb : ''}`}
                                    onClick={() => setSelectedImageIndex(index)}
                                >
                                    <img 
                                        src={`${''}/${path}`}
                                        alt={`${mainOffer.productName} - ${index + 1}`}
                                        onError={(e) => {
                                            // Hide broken thumbnail
                                            e.currentTarget.parentElement!.style.display = 'none';
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
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
                        {/* Barem Bilgisi - offer'ın gerçek malFazlasi değerinden al */}
                        {(() => {
                            const actualBarem = (mainOffer as any).malFazlasi || '0+0';
                            const parts = actualBarem.split('+').map((s: string) => parseInt(s.trim()) || 0);
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
                            {/* 🆕 Stok Durumu Uyarısı */}
                            {/* 🆕 Sadece Kilitli Stok Uyarısı */}
                            {othersLockedQuantity > 0 && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    backgroundColor: canBuy ? '#fef3c7' : '#fee2e2',
                                    border: `1px solid ${canBuy ? '#f59e0b' : '#ef4444'}`,
                                    borderRadius: '8px',
                                    marginBottom: '12px',
                                    fontSize: '13px',
                                    color: canBuy ? '#b45309' : '#dc2626',
                                    fontWeight: '500',
                                }}>
                                    <span style={{ fontSize: '16px' }}>⏳</span>
                                    <span>
                                        {othersLockedQuantity} adet <strong>işlemde</strong>
                                    </span>
                                </div>
                            )}
                            
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
                                            disabled={!canBuy || isMainAdding}
                                            onClick={handleMainAddToCart}
                                        >
                                            {isMainAdding ? 'Talep Edildi!' : (canBuy ? '📦 Talep Et' : 'Barem Doldu')}
                                        </button>
                                    </div>
                                    {/* Depo sorumlusu checkbox */}
                                    <label style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '8px 12px',
                                        backgroundColor: isDepotSelfOrder ? '#ddd6fe' : '#ede9fe',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#5b21b6',
                                        border: isDepotSelfOrder ? '2px solid #8b5cf6' : '2px solid transparent',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <input 
                                            type="checkbox" 
                                            checked={isDepotSelfOrder}
                                            onChange={(e) => setIsDepotSelfOrder(e.target.checked)}
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
                                <PriceChart data={[]} /> {/* TODO: Fetch real price history from API */}
                            </div>
                        </div>
                        <div className={styles.offerCountWrapper}>
                            <div className={styles.offerCount}>
                                <span>{typeFilter === 'jointorder' ? 'Katılımcı Sayısı' : typeFilter === 'purchaserequest' ? 'Talep Sayısı' : 'Teklif Sayısı'}</span>
                                <strong>
                                    {typeFilter === 'jointorder' || typeFilter === 'purchaserequest'
                                        // Organizatör (1) + Katılımcılar (buyers count)
                                        ? 1 + (mainOffer?.buyers?.length || 0)
                                        : offers.length
                                    }
                                </strong>
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
                const singleBaremTotal = baremMin + baremBonus;
                
                // Tüm tekliflerdeki talep edilen stokları topla
                const totalRequestedStock = offers.reduce((sum, o) => {
                    const stockParts = o.stock.split('+').map((s: string) => parseInt(s.trim()) || 0);
                    return sum + (stockParts[0] || 0);
                }, 0);
                
                // 🆕 Tüm siparişleri (buyers) topla
                const totalOrderedStock = offers.reduce((sum, o) => {
                    if (o.buyers && o.buyers.length > 0) {
                        return sum + o.buyers.reduce((bSum, b) => bSum + b.quantity, 0);
                    }
                    return sum;
                }, 0);
                
                // Toplam doluluk = talepler + siparişler
                const totalUsedStock = totalRequestedStock + totalOrderedStock;
                
                // 🆕 Barem katını hesapla: toplam kullanım / tek barem = kaç kat gerekli
                const baremMultiple = Math.max(1, Math.ceil(totalUsedStock / singleBaremTotal));
                const effectiveBaremTotal = singleBaremTotal * baremMultiple;
                
                // 🆕 Kalan ve doluluk oranı efektif baremine göre hesaplanıyor (siparişler de dahil)
                const remainingStock = Math.max(0, effectiveBaremTotal - totalUsedStock);
                const usagePercent = (totalUsedStock / effectiveBaremTotal) * 100;
                
                // 🆕 Display için barem bilgisi
                const displayBaremInfo = baremMultiple > 1 
                    ? `${baremMin}+${baremBonus} × ${baremMultiple} = ${effectiveBaremTotal}` 
                    : `${baremMin}+${baremBonus} = ${singleBaremTotal}`;
                
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
                                    {displayBaremInfo}
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
                                <div style={{ fontSize: '22px', fontWeight: '700', color: '#dc2626' }}>{totalUsedStock} Adet</div>
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
                                    %{Math.min(usagePercent, 100).toFixed(0)} ({1 + (mainOffer?.buyers?.length || 0)} Katılımcı)
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

            {/* Depo Fiyatları - Scraped Data Integration */}
            {(() => {
                // Mevcut ilaç için barem verilerini filtrele
                const productName = mainOffer.productName || '';
                const productBarems = warehouseBaremsData.filter(b => 
                    b.productName.toLowerCase().includes(productName.toLowerCase()) || 
                    productName.toLowerCase().includes(b.productName.toLowerCase())
                );
                
                // Eğer scrap edilen (barem) veri varsa onları kullan
                // Yoksa genel mock veriyi (warehouseOffersData) kullan
                let displayData: WarehouseOffer[] = [];
                
                if (productBarems.length > 0) {
                    displayData = productBarems.map((b, index) => ({
                        id: index + 1000,
                        warehouseName: b.warehouseName,
                        price: b.netPrice, // Birim Fiyat (Net Fiyat)
                        stockInfo: `${b.quantity}+${b.bonus}` // Barem bilgisi
                    }));
                } else {
                    // Veri yoksa standart listeyi göster ama fiyatları ilaca göre biraz değiştir (görsel çeşitlilik için)
                    displayData = warehouseOffersData.map(w => ({
                        ...w,
                        price: mainOffer.price * (0.9 + Math.random() * 0.2) // +/- %10 değişim
                    }));
                    
                    // Alliance Healthcare için özel birim fiyat vurgusu (User talebi)
                    // Eğer listede Alliance varsa, onun fiyatını net gösterelim
                    const allianceIdx = displayData.findIndex(d => d.warehouseName.includes('Alliance'));
                    if (allianceIdx >= 0) {
                        displayData[allianceIdx].price = mainOffer.price * 0.95; // %5 indirimli gibi göster
                    }
                }
                
                return <WarehouseOffers data={displayData} />;
            })()}

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
                                const organizerStock = stockParts[0] || 0;
                                const sold = (o as any).soldQuantity || 0;
                                return sum + organizerStock + sold;
                            }, 0);
                            baremRemainingStock = Math.max(0, totalBaremStock - totalRequestedStock);
                        }
                        
                        // Render each offer and its buyers as separate cards
                        const items: React.ReactNode[] = [];
                        
                        offers.forEach(offer => {
                            // Add the offer card
                            items.push(
                                <OfferItemComponent
                                    key={`offer-${offer.id}`}
                                    offer={offer}
                                    showBarem={!baremFilter}
                                    baremRemainingStock={baremRemainingStock}
                                    isJointOrder={typeFilter === 'jointorder'}
                                    isPurchaseRequest={typeFilter === 'purchaserequest'}
                                />
                            );
                            
                            // Add buyer cards separately (for JointOrder and PurchaseRequest)
                            if ((typeFilter === 'jointorder' || typeFilter === 'purchaserequest') && offer.buyers && offer.buyers.length > 0) {
                                offer.buyers.forEach((buyer, idx) => {
                                    items.push(
                                        <div key={`buyer-${offer.id}-${idx}`} className={styles.offerItem}>
                                            <span className={styles.offerPrice} style={{ color: '#059669' }}>
                                                Talep
                                            </span>
                                            <div className={styles.offerSellerInfo}>
                                                <Link href={`/profile/${buyer.pharmacyId}`} className={styles.sellerLink} style={{ color: '#047857' }}>
                                                    {buyer.pharmacyName}
                                                </Link>
                                                {buyer.orderDate && (
                                                    <span style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginTop: '2px' }}>
                                                        {buyer.orderDate}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={styles.offerStock}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#059669' }}>{buyer.quantity} Adet</div>
                                                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280' }}>talep edildi</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            }
                        });
                        
                        return items;
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