// src/app/(dashboard)/raporlar/ozet/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';

// Stil ve Bileşenler
// DÜZELTME: dashboard.css yolunu (dashboard) içine al
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from '../raporDetay.module.css';
import PriceChart from '@/components/ilaclar/PriceChart'; 

// Panel Bileşenleri (TÜMÜ SİLİNDİ)

// Veriler
import {
  financialSummaryData,
  PriceData
} from '@/lib/dashboardData';

// Tipler (TÜMÜ SİLİNDİ)

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;


export default function FinansalOzetPage() {
  // --- Standart Panel State Yönetimi SİLİNDİ ---
  // --- State Yönetimi Sonu ---

  const totalCiro = 95500;
  const totalMaliyet = 62000;
  const netKar = totalCiro - totalMaliyet;

  return (
    // <div className="dashboard-container"> // SİLİNDİ
    //   <Sidebar /> // SİLİNDİ
    //   <Header /> // SİLİNDİ
    //   <main className="main-content"> // SİLİNDİ
        <div className={styles.pageContainer}>
          
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Finansal Özet Raporu</h1>
            <Link href="/raporlar" className={styles.backButton}>
              <BackIcon />
              <span>Geri Dön</span>
            </Link>
          </div>

          <div className={styles.reportFilters}>
            <div className={styles.filterGroup}>
              <label htmlFor="dateRange">Zaman Aralığı</label>
              <select id="dateRange" defaultValue="6ay">
                <option value="3ay">Son 3 Ay</option>
                <option value="6ay">Son 6 Ay</option>
                <option value="1yil">Son 1 Yıl</option>
              </select>
            </div>
          </div>

          <div className={styles.summaryContainer}>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryCardTitle}>Toplam Ciro (Satış)</h3>
              <p className={styles.summaryCardValue}>{totalCiro.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            </div>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryCardTitle}>Toplam Maliyet (Alış)</h3>
              <p className={`${styles.summaryCardValue} ${styles.negative}`}>{totalMaliyet.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            </div>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryCardTitle}>Net Kâr</h3>
              <p className={`${styles.summaryCardValue} ${styles.positive}`}>{netKar.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            </div>
          </div>

          <div className={styles.chartContainer}>
            <h3>Aylık Net Kâr Değişimi</h3>
            <PriceChart data={financialSummaryData as PriceData[]} />
          </div>

        </div>
    //   </main> // SİLİNDİ
    //   {/* --- Panel ve Modal Alanı SİLİNDİ --- */}
    // </div> // SİLİNDİ
  );
}