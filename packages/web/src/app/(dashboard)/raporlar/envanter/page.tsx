// src/app/(dashboard)/raporlar/envanter/page.tsx
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
  envanterReportData,
  financialSummaryData,
  PriceData
} from '@/lib/dashboardData';

// Tipler (TÜMÜ SİLİNDİ)

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;

export default function EnvanterRaporuPage() {
  // --- Standart Panel State Yönetimi SİLİNDİ ---
  // --- State Yönetimi Sonu ---

  // Rapor verilerini hesapla (Örnek)
  const toplamMaliyet = envanterReportData.reduce((acc, item) => acc + item.totalCostValue, 0);
  const toplamSatisDegeri = envanterReportData.reduce((acc, item) => acc + item.totalSalesValue, 0);
  const toplamKalem = envanterReportData.length;

  return (
    // <div className="dashboard-container"> // SİLİNDİ
    //   <Sidebar /> // SİLİNDİ
    //   <Header /> // SİLİNDİ
    //   <main className="main-content"> // SİLİNDİ
        <div className={styles.pageContainer}>
          
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Envanter Değer Raporu</h1>
            <Link href="/raporlar" className={styles.backButton}>
              <BackIcon />
              <span>Geri Dön</span>
            </Link>
          </div>

          <div className={styles.reportFilters}>
             <div className={styles.filterGroup}>
              <label htmlFor="category">Kategori</label>
              <select id="category" defaultValue="">
                <option value="">Tüm Kategoriler</option>
                <option value="agri">Ağrı Kesici</option>
                <option value="ates">Ateş Düşürücü</option>
                <option value="vitamin">Vitamin</option>
              </select>
            </div>
          </div>

          <div className={styles.summaryContainer}>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryCardTitle}>Toplam Envanter (Maliyet)</h3>
              <p className={styles.summaryCardValue}>{toplamMaliyet.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            </div>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryCardTitle}>Toplam Envanter (Satış Değeri)</h3>
              <p className={`${styles.summaryCardValue}`}>{toplamSatisDegeri.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            </div>
            <div className={styles.summaryCard}>
              <h3 className={styles.summaryCardTitle}>Toplam Kalem (Çeşit)</h3>
              <p className={styles.summaryCardValue}>{toplamKalem}</p>
            </div>
          </div>
          
          <div className={styles.chartContainer}>
            <h3>Aylık Toplam Envanter Değişimi (Maliyet)</h3>
            <PriceChart data={financialSummaryData.map(d => ({...d, price: d.price * 2.5})) as PriceData[]} />
          </div>

          <DashboardCard title="Detaylı Envanter Listesi">
            <table className={`${tableStyles.table} ${styles.reportTable}`}>
              <thead>
                <tr>
                  <th>Ürün Adı</th>
                  <th>Kategori</th>
                  <th>Stok (Adet+MF)</th>
                  <th className={tableStyles.textRight}>Maliyet Fiyatı</th>
                  <th className={tableStyles.textRight}>Satış Fiyatı</th>
                  <th className={tableStyles.textRight}>Toplam Maliyet</th>
                  <th className={tableStyles.textRight}>Toplam Satış Değeri</th>
                </tr>
              </thead>
              <tbody>
                {envanterReportData.map(item => (
                  <tr key={item.id}>
                    <td>{item.productName}</td>
                    <td>{item.category}</td>
                    <td>{item.stock}</td>
                    <td className={tableStyles.textRight}>{item.costPrice.toFixed(2)} ₺</td>
                    <td className={`${tableStyles.textRight} ${tableStyles.fontBold}`}>{item.price.toFixed(2)} ₺</td>
                    <td className={tableStyles.textRight}>{item.totalCostValue.toFixed(2)} ₺</td>
                    <td className={`${tableStyles.textRight} ${tableStyles.fontBold}`}>{item.totalSalesValue.toFixed(2)} ₺</td>
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