// src/app/(dashboard)/ilaclar/page.tsx
'use client';

export const dynamic = 'force-dynamic';


import React, { useState, useCallback } from 'react';
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './ilaclar.module.css';

import FilterPanel from '@/components/ilaclar/FilterPanel';
import ProductCard from '@/components/ilaclar/ProductCard';

// ✅ Backend'den teklifleri çek
import { useOffers } from '@/hooks/useOffers';

const FilterIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>;
const SortIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" /></svg>;

export default function IlaclarPage() {
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    
    // ✅ Backend'den teklif listesini çek
    const { offers, loading, error } = useOffers();

    const toggleFilterVisibility = useCallback(() => {
        setIsFilterVisible(prev => !prev);
    }, []);

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
                {offers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px', gridColumn: '1 / -1' }}>
                        Henüz teklif bulunamadı.
                    </div>
                ) : (
                    offers.map(offer => {
                        // Parse stock string "10 + 2"
                        const stockParts = offer.stock.split('+').map(s => parseInt(s.trim()) || 0);
                        const currentStock = stockParts[0];
                        const bonus = stockParts[1] || 0;

                        return (
                            <ProductCard key={offer.id} medication={{
                                id: offer.medicationId,
                                name: offer.productName || 'Bilinmiyor',
                                manufacturer: offer.manufacturer || 'Bilinmiyor',
                                imageUrl: offer.imageUrl || '/placeholder-med.png',
                                price: offer.price,
                                expirationDate: offer.expirationDate || '',
                                initialStock: currentStock + bonus, // Tahmini
                                currentStock: currentStock,
                                bonus: bonus,
                                sellers: [{
                                    pharmacyId: String(offer.pharmacyId),
                                    pharmacyName: offer.pharmacyName || 'Bilinmiyor',
                                    pharmacyUsername: offer.pharmacyUsername || 'bilinmiyor'
                                }]
                            }} />
                        );
                    })
                )}
            </div>
        </div>
    );
}