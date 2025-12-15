// src/app/(dashboard)/ilaclar/page.tsx
'use client';

export const dynamic = 'force-dynamic';


import React, { useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './ilaclar.module.css';

import FilterPanel from '@/components/ilaclar/FilterPanel';
import ProductCard from '@/components/ilaclar/ProductCard';

// ✅ Backend'den teklifleri çek
import { useOffers } from '@/hooks/useOffers';

const FilterIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>;
const SortIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" /></svg>;

// SKT parse helper - "MM/yyyy" formatından Date'e çevir
const parseExpirationDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 2) {
        const month = parseInt(parts[0], 10) - 1;
        const year = parseInt(parts[1], 10);
        return new Date(year, month + 1, 0); // Ayın son günü
    }
    return null;
};

// SKT geçmiş mi kontrol et
const isExpired = (dateStr: string | null | undefined): boolean => {
    const expDate = parseExpirationDate(dateStr);
    if (!expDate) return false;
    return expDate < new Date();
};

export default function IlaclarPage() {
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [showExpired, setShowExpired] = useState(false);
    
    // ✅ Backend'den teklif listesini çek
    const { offers, loading, error } = useOffers();

    const toggleFilterVisibility = useCallback(() => {
        setIsFilterVisible(prev => !prev);
    }, []);

    // 🆕 Offer type filtering from URL
    const searchParams = useSearchParams();
    const router = useRouter();
    const typeFilter = searchParams.get('type')?.toLowerCase() || '';
    
    // 🆕 Handle offer type filter change
    const handleTypeFilterChange = useCallback((type: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (type) {
            params.set('type', type);
        } else {
            params.delete('type');
        }
        router.push(`/ilaclar?${params.toString()}`);
    }, [searchParams, router]);

    // Filtered offers
    const filteredOffers = useMemo(() => {
        return offers.filter(offer => {
            const expired = isExpired(offer.expirationDate);
            // showExpired aktifse -> miadı geçmişleri göster
            // showExpired pasifse -> miadı geçmemişleri göster
            const expiryMatch = showExpired ? expired : !expired;
            
            // 🆕 Offer type filter
            const typeMatch = !typeFilter || (offer.type?.toLowerCase() === typeFilter);
            
            return expiryMatch && typeMatch;
        });
    }, [offers, showExpired, typeFilter]);

    if (loading) {
        return (
            <div className={styles.pageContainer}>
                <div style={{ textAlign: 'center', padding: '50px' }}>Teklifler yükleniyor...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.pageContainer}>
                <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>Hata: {error}</div>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>İlaç Vitrini</h1>
                <div className={styles.headerActions}>
                    {/* Miadı Geçmişler Checkbox */}
                    <label className={styles.expiredCheckbox}>
                        <input
                            type="checkbox"
                            checked={showExpired}
                            onChange={(e) => setShowExpired(e.target.checked)}
                        />
                        <span>Miadı Geçmişler</span>
                    </label>
                    
                    <div className={styles.selectWrapper}>
                        <SortIcon />
                        <select className={styles.actionSelect}>
                            <option>Önerilen Sıralama</option>
                            <option>Fiyat: Artan</option>
                            <option>Fiyat: Azalan</option>
                            <option>SKT: En Yakın</option>
                        </select>
                    </div>
                    <button 
                        className={`${styles.actionButton} ${isFilterVisible ? styles.active : ''}`} 
                        onClick={toggleFilterVisibility}
                    >
                        <FilterIcon />
                        <span>Filtrele</span>
                    </button>
                </div>
            </div>
            
            {/* 🆕 Offer Type Filter Buttons */}
            <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
                flexWrap: 'wrap'
            }}>
                <button
                    onClick={() => handleTypeFilterChange('')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        transition: 'all 0.2s',
                        backgroundColor: !typeFilter ? '#3b82f6' : '#e5e7eb',
                        color: !typeFilter ? 'white' : '#374151'
                    }}
                >
                    Tümü
                </button>
                <button
                    onClick={() => handleTypeFilterChange('stocksale')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        transition: 'all 0.2s',
                        backgroundColor: typeFilter === 'stocksale' ? '#10b981' : '#e5e7eb',
                        color: typeFilter === 'stocksale' ? 'white' : '#374151'
                    }}
                >
                    Stok Satışı
                </button>
                <button
                    onClick={() => handleTypeFilterChange('jointorder')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        transition: 'all 0.2s',
                        backgroundColor: typeFilter === 'jointorder' ? '#f97316' : '#e5e7eb',
                        color: typeFilter === 'jointorder' ? 'white' : '#374151'
                    }}
                >
                    Ortak Sipariş
                </button>
                <button
                    onClick={() => handleTypeFilterChange('purchaserequest')}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px',
                        transition: 'all 0.2s',
                        backgroundColor: typeFilter === 'purchaserequest' ? '#8b5cf6' : '#e5e7eb',
                        color: typeFilter === 'purchaserequest' ? 'white' : '#374151'
                    }}
                >
                    Alım Talebi
                </button>
            </div>
            <div className={`${styles.filterContainer} ${isFilterVisible ? styles.visible : ''}`}>
                <FilterPanel />
            </div>
            <div className={styles.productGrid}>
                {filteredOffers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px', gridColumn: '1 / -1' }}>
                        {showExpired ? 'Miadı geçmiş teklif bulunamadı.' : 'Henüz teklif bulunamadı.'}
                    </div>
                ) : (
                    // Her teklif için bireysel kart - offer ID ile benzersiz URL
                    filteredOffers.map((offer) => {
                        // 🔧 FIX: Always use malFazlasi for barem display (it contains the real warehouse barem)
                        // offer.stock contains requested quantity, malFazlasi contains actual barem like "15+5"
                        const barem = (offer as any).malFazlasi || '1+0';
                        const baremParam = encodeURIComponent(barem);
                        
                        // Parse barem for display
                        const baremParts = barem.split('+').map((s: string) => parseInt(s.trim()) || 0);
                        const baremTotal = (baremParts[0] || 0) + (baremParts[1] || 0);
                        
                        // 🔧 FIX: Parse offer.stock to get requested quantity
                        // offer.stock comes as "7 + 5" string, first number is the request
                        const stockParts = offer.stock.split('+').map((s: string) => parseInt(s.trim()) || 0);
                        const requestedQuantity = stockParts[0] || 0; // Talep edilen miktar
                        
                        const offerTypeLC = offer.type?.toLowerCase();
                        const isJointType = offerTypeLC === 'jointorder' || offerTypeLC === 'purchaserequest';
                        
                        // For JointOrder/PurchaseRequest: currentStock = requested quantity (not barem total)
                        // For StockSale: currentStock = remaining stock
                        const soldQuantity = (offer as any).soldQuantity || 0;
                        const currentStock = isJointType ? requestedQuantity : ((offer as any).remainingStock ?? (baremTotal - soldQuantity));
                        const remainingStock = isJointType 
                            ? Math.max(0, baremTotal - requestedQuantity - soldQuantity)
                            : ((offer as any).remainingStock ?? (baremTotal - soldQuantity));
                        
                        return (
                            <ProductCard 
                                key={offer.id} 
                                medication={{
                                    id: offer.medicationId,
                                    name: offer.productName || 'Bilinmiyor',
                                    manufacturer: offer.manufacturer || 'Bilinmiyor',
                                    imageUrl: offer.imageUrl || '/logoYesil.png',
                                    imageCount: offer.imageCount || 1,
                                    price: offer.price,
                                    expirationDate: offer.expirationDate || '',
                                    initialStock: baremTotal,
                                    currentStock: currentStock,
                                    soldQuantity: soldQuantity,
                                    remainingStock: remainingStock,
                                    bonus: baremParts[1] || 0,
                                    sellers: [{
                                        pharmacyId: String(offer.pharmacyId),
                                        pharmacyName: offer.pharmacyName || 'Bilinmiyor',
                                        pharmacyUsername: offer.pharmacyUsername || ''
                                    }],
                                    malFazlasi: barem
                                }}
                                linkHref={`/ilaclar/${offer.medicationId}?barem=${baremParam}&type=${offer.type?.toLowerCase() || 'stocksale'}&offerId=${offer.id}`}
                                extraSellerCount={0}
                                offerType={offer.type}
                                buyers={offer.buyers}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
}