// src/app/(dashboard)/raporlar/miad/page.tsx
'use client';

import React from 'react';
import Link from 'next/link';

// Stil ve Bileşenler
// DÜZELTME: dashboard.css yolunu (dashboard) içine al
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from '../raporDetay.module.css';
import tableStyles from '@/components/dashboard/Table.module.css';
import DashboardCard from '@/components/DashboardCard';

// Panel Bileşenleri (TÜMÜ SİLİNDİ)

// Veriler
import {
  miadReportData,
} from '@/data/dashboardData';

// Tipler (TÜMÜ SİLİNDİ)

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;

export default function MiadRaporuPage() {
  // --- Standart Panel State Yönetimi SİLİNDİ ---
  // --- State Yönetimi Sonu ---

  // Rapor verilerini hesapla (Örnek)
  const risktekiDeger = miadReportData.reduce((acc, item) => item.daysRemaining <= 90 ? acc + item.costValue : acc, 0);
  const yakinMiadDegeri = miadReportData.reduce((acc, item) => item.daysRemaining <= 180 ? acc + item.costValue : acc, 0);
  
  return (
    // <div className="dashboard-container"> // SİLİNDİ
    //   <Sidebar /> // SİLİNDİ
    //   <Header /> // SİLİNDİ
    //   <main className="main-content"> // SİLİNDİ
        <div className={styles.pageContainer}>
          
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Miad Raporu</h1>
            <Link href="/raporlar" className={styles.backButton}>
              <BackIcon />
              <span>Geri Dön</span>
            </Link>
          </div>

          <div className={styles.reportFilters}>
             <div className={styles.filterGroup}>
              <label htmlFor="expiryRange">Miad Aralığı</label>
              <select id="expiryRange" defaultValue="6ay">
                <option value="3ay">Son 3 Ay (90 Gün)</option>
                <option value="6ay">Son 6 Ay (180 Gün)</option>
                <option value="1yil">Son 1 Yıl (365 Gün)</option>
              </select>
            </div>
          </div>

          <div className={styles.summaryContainer}>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryCardTitle}>Kritik Risk Değeri (90 Gün)</h3>
              <p className={`${styles.summaryCardValue} ${styles.negative}`}>{risktekiDeger.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            </div>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryCardTitle}>Yakın Miad Değeri (180 Gün)</h3>
              <p className={styles.summaryCardValue}>{yakinMiadDegeri.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            </div>
          </div>
          
          <DashboardCard title="Miadı Yaklaşan Ürünler Listesi">
            <table className={`${tableStyles.table} ${styles.reportTable}`}>
              <thead>
                <tr>
                  <th>Ürün Adı</th>
                  <th>S.K.T.</th>
                  <th className={tableStyles.textRight}>Kalan Gün</th>
                  <th>Stok (Adet+MF)</th>
                  <th className={tableStyles.textRight}>Maliyet Değeri</th>
                  <th className={tableStyles.textRight}>Satış Değeri</th>
                </tr>
              </thead>
              <tbody>
                {miadReportData.sort((a, b) => a.daysRemaining - b.daysRemaining).map(item => (
                  <tr key={item.id} style={{backgroundColor: item.daysRemaining <= 90 ? '#fef2f2' : (item.daysRemaining <= 180 ? '#fffbeb' : 'transparent')}}>
                    <td>{item.productName}</td>
                    <td>{item.expirationDate}</td>
                    <td className={`${tableStyles.textRight} ${tableStyles.fontBold}`}>{item.daysRemaining}</td>
                    <td>{item.stock}</td>
                    <td className={tableStyles.textRight}>{item.costValue.toFixed(2)} ₺</td>
                    <td className={`${tableStyles.textRight} ${tableStyles.fontBold}`}>{item.totalValue.toFixed(2)} ₺</td>
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