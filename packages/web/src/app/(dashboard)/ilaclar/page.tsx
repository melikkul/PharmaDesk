// src/app/(dashboard)/ilaclar/page.tsx
'use client';

export const dynamic = 'force-dynamic';


import React, { useState, useCallback, useMemo } from 'react';
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

    // Filtered offers
    const filteredOffers = useMemo(() => {
        return offers.filter(offer => {
            const expired = isExpired(offer.expirationDate);
            // showExpired aktifse -> miadı geçmişleri göster
            // showExpired pasifse -> miadı geçmemişleri göster
            return showExpired ? expired : !expired;
        });
    }, [offers, showExpired]);

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
            <div className={`${styles.filterContainer} ${isFilterVisible ? styles.visible : ''}`}>
                <FilterPanel />
            </div>
            <div className={styles.productGrid}>
                {filteredOffers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px', gridColumn: '1 / -1' }}>
                        {showExpired ? 'Miadı geçmiş teklif bulunamadı.' : 'Henüz teklif bulunamadı.'}
                    </div>
                ) : (
                    // Her ilaç + barem kombinasyonu için ayrı kart
                    Object.values(
                        filteredOffers.reduce((acc, offer) => {
                            // medicationId + malFazlasi kombinasyonu ile grupla
                            const barem = (offer as any).malFazlasi || '1+0';
                            const key = `${offer.medicationId}-${barem}`;
                            
                            // Parse stock for this offer
                            const stockParts = offer.stock.split('+').map(s => parseInt(s.trim()) || 0);
                            const offerStock = stockParts[0];
                            const offerSold = (offer as any).soldQuantity || 0;
                            
                            if (!acc[key]) {
                                // Aynı ilaç ve barem için tüm teklifleri bul
                                const allOffersForDrugBarem = filteredOffers.filter(o => 
                                    o.medicationId === offer.medicationId && 
                                    ((o as any).malFazlasi || '1+0') === barem
                                );
                                
                                // Toplam stok ve satılan hesapla
                                let totalStock = 0;
                                let totalSold = 0;
                                allOffersForDrugBarem.forEach(o => {
                                    const parts = o.stock.split('+').map(s => parseInt(s.trim()) || 0);
                                    totalStock += parts[0];
                                    totalSold += (o as any).soldQuantity || 0;
                                });
                                
                                // Fiyata göre sırala ve en ucuz 2 eczaneyi al
                                const sortedOffers = [...allOffersForDrugBarem].sort((a, b) => a.price - b.price);
                                const topSellers = sortedOffers.slice(0, 2).map(o => ({
                                    pharmacyId: String(o.pharmacyId),
                                    pharmacyName: o.pharmacyName || 'Bilinmiyor',
                                    pharmacyUsername: o.pharmacyUsername || ''
                                }));
                                
                                acc[key] = {
                                    offer: sortedOffers[0], // En ucuz teklif
                                    offerCount: allOffersForDrugBarem.length,
                                    totalStock,
                                    totalSold,
                                    remainingStock: totalStock - totalSold,
                                    barem,
                                    topSellers
                                };
                            }
                            return acc;
                        }, {} as Record<string, { 
                            offer: typeof filteredOffers[0], 
                            offerCount: number, 
                            totalStock: number, 
                            totalSold: number,
                            remainingStock: number,
                            barem: string,
                            topSellers: { pharmacyId: string; pharmacyName: string; pharmacyUsername: string }[]
                        }>)
                    ).map(({ offer, offerCount, totalStock, totalSold, remainingStock, barem, topSellers }) => {
                        // URL'e barem parametresi ekle
                        const baremParam = encodeURIComponent(barem);
                        const extraSellerCount = offerCount > 2 ? offerCount - 2 : 0;
                        return (
                            <ProductCard 
                                key={`${offer.medicationId}-${barem}`} 
                                medication={{
                                    id: offer.medicationId,
                                    name: offer.productName || 'Bilinmiyor',
                                    manufacturer: offer.manufacturer || 'Bilinmiyor',
                                    imageUrl: offer.imageUrl || '/placeholder-med.png',
                                    price: offer.price,
                                    expirationDate: offer.expirationDate || '',
                                    initialStock: totalStock,
                                    currentStock: totalStock,
                                    soldQuantity: totalSold,
                                    remainingStock: remainingStock,
                                    bonus: 0,
                                    sellers: topSellers,
                                    malFazlasi: barem
                                }}
                                linkHref={`/ilaclar/${offer.medicationId}?barem=${baremParam}`}
                                extraSellerCount={extraSellerCount}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
}