// src/app/(dashboard)/ilaclar/page.tsx
'use client';

// ### OPTİMİZASYON: 'useCallback' import edildi ###
import React, { useState, useCallback } from 'react';
// DÜZELTME: dashboard.css yolunu (dashboard) içine al
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './ilaclar.module.css';

// ANA BİLEŞENLER
import FilterPanel from '@/components/ilaclar/FilterPanel';
import ProductCard from '@/components/ilaclar/ProductCard';

// BİLDİRİM & MESAJ BİLEŞENLERİ (TÜMÜ SİLİNDİ)

// VERİLER
import { ilaclarShowroomData } from '@/data/dashboardData';

// İkonlar
const FilterIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>;
const SortIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" /></svg>;

export default function IlaclarPage() {
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    
    // --- Bildirim/Mesaj/Sepet State'leri SİLİNDİ ---
    // --- Handler Fonksiyonları SİLİNDİ ---

    // ### OPTİMİZASYON: useCallback ###
    // Filtre panelinin görünürlüğünü değiştiren fonksiyon memoize edildi.
    const toggleFilterVisibility = useCallback(() => {
        setIsFilterVisible(prev => !prev);
    }, []); // Bağımlılığı yok

    return (
      // <div className="dashboard-container"> // SİLİNDİ
      //   <Sidebar /> // SİLİNDİ
      //   <Header /> // SİLİNDİ
      //   <main className="main-content"> // SİLİNDİ
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
                            onClick={toggleFilterVisibility} // Memoize edilmiş fonksiyon kullanılıyor
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
                    {ilaclarShowroomData.map(med => (<ProductCard key={med.id} medication={med} />))}
                </div>
            </div>
      //   </main> // SİLİNDİ
      //   {/* --- Panel ve Modal Alanı SİLİNDİ --- */}
      // </div> // SİLİNDİ
    );
}