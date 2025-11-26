// src/app/(dashboard)/raporlar/performans/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';

// Stil ve Bileşenler
// DÜZELTME: dashboard.css yolunu (dashboard) içine al
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from '../raporDetay.module.css';
import tableStyles from '@/components/dashboard/Table.module.css';
import DashboardCard from '@/components/DashboardCard';
import PriceChart from '@/components/ilaclar/PriceChart'; 

// Panel Bileşenleri (TÜMÜ SİLİNDİ)

// Veriler
import {
  performanceReportData,
  financialSummaryData,
  PriceData
} from '@/lib/dashboardData';

// Tipler (TÜMÜ SİLİNDİ)

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;

export default function PerformansRaporuPage() {
  // --- Standart Panel State Yönetimi SİLİNDİ ---
  // --- State Yönetimi Sonu ---

  // Rapor verilerini hesapla (Örnek)
  const toplamGoruntulenme = performanceReportData.reduce((acc, item) => acc + item.views, 0);
  const toplamSatis = performanceReportData.reduce((acc, item) => acc + item.salesCount, 0);
  const ortDonusum = (toplamSatis / toplamGoruntulenme) * 100;

  return (
    // <div className="dashboard-container"> // SİLİNDİ
    //   <Sidebar /> // SİLİNDİ
    //   <Header /> // SİLİNDİ
    //   <main className="main-content"> // SİLİNDİ
        <div className={styles.pageContainer}>
          
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Teklif Performans Raporu</h1>
            <Link href="/raporlar" className={styles.backButton}>
              <BackIcon />
              <span>Geri Dön</span>
            </Link>
          </div>

          <div className={styles.reportFilters}>
             <div className={styles.filterGroup}>
              <label htmlFor="dateRange">Tarih Aralığı</label>
              <input type="date" id="dateStart" />
            </div>
             <div className={styles.filterGroup}>
              <label htmlFor="dateEnd">&nbsp;</label>
              <input type="date" id="dateEnd" />
            </div>
          </div>

          <div className={styles.summaryContainer}>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryCardTitle}>Toplam Teklif Görüntülenme</h3>
              <p className={styles.summaryCardValue}>{toplamGoruntulenme.toLocaleString('tr-TR')}</p>
            </div>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryCardTitle}>Toplam Satış (Adet)</h3>
              <p className={styles.summaryCardValue}>{toplamSatis.toLocaleString('tr-TR')}</p>
            </div>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryCardTitle}>Ortalama Dönüşüm Oranı</h3>
              <p className={`${styles.summaryCardValue} ${styles.positive}`}>{ortDonusum.toFixed(2)}%</p>
            </div>
          </div>
          
          <div className={styles.chartContainer}>
            <h3>Günlük Satış Hacmi (TL)</h3>
            <PriceChart data={financialSummaryData.map(d => ({...d, price: d.price / 2})) as PriceData[]} />
          </div>

          <DashboardCard title="Detaylı Performans Listesi (En Çok Görüntülenenler)">
            <table className={`${tableStyles.table} ${styles.reportTable}`}>
              <thead>
                <tr>
                  <th>Ürün Adı</th>
                  <th>Stok</th>
                  <th className={tableStyles.textRight}>Fiyat</th>
                  <th className={tableStyles.textRight}>Görüntülenme</th>
                  <th className={tableStyles.textRight}>Satış (Adet)</th>
                  <th className={tableStyles.textRight}>Dönüşüm Oranı</th>
                </tr>
              </thead>
              <tbody>
                {performanceReportData.sort((a, b) => b.views - a.views).map(item => (
                  <tr key={item.id}>
                    <td>{item.productName}</td>
                    <td>{item.stock}</td>
                    <td className={`${tableStyles.textRight}`}>{item.price.toFixed(2)} ₺</td>
                    <td className={`${tableStyles.textRight} ${tableStyles.fontBold}`}>{item.views}</td>
                    <td className={tableStyles.textRight}>{item.salesCount}</td>
                    <td className={`${tableStyles.textRight} ${tableStyles.fontBold}`}>{item.conversionRate.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DashboardCard>

        </div>
    //   </main> // SİLİNDİ
    //   {/* --- Panel ve Modal Alanı SİLİNDİ --- */}
    // </div> // SİLİNDİ
  );
}