// src/app/(dashboard)/raporlar/talep/page.tsx
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
  demandReportData,
} from '@/data/dashboardData';

// Tipler (TÜMÜ SİLİNDİ)

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;

export default function TalepRaporuPage() {
  // --- Standart Panel State Yönetimi SİLİNDİ ---
  // --- State Yönetimi Sonu ---
  
  return (
    // <div className="dashboard-container"> // SİLİNDİ
    //   <Sidebar /> // SİLİNDİ
    //   <Header /> // SİLİNDİ
    //   <main className="main-content"> // SİLİNDİ
        <div className={styles.pageContainer}>
          
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Piyasa Talep Raporu</h1>
            <Link href="/raporlar" className={styles.backButton}>
              <BackIcon />
              <span>Geri Dön</span>
            </Link>
          </div>

          <div className={styles.summaryCard}>
            <h3 className={styles.summaryCardTitle}>Rapor Açıklaması</h3>
            <p style={{margin: 0, color: 'var(--text-primary)'}}>
              Bu raporda, diğer eczacıların sistem genelinde aradığı ancak sizin envanterinizde bulunmayan veya o an "Pasif" / "Stokta Yok" durumunda olan ilaçları görebilirsiniz. 
              Bu liste, potansiyel talebi keşfetmeniz için bir fırsattır.
            </p>
          </div>
          
          <DashboardCard title="En Çok Aranan ve Sizde Olmayan İlaçlar">
            <table className={`${tableStyles.table} ${styles.reportTable}`}>
              <thead>
                <tr>
                  <th>Aranan Terim</th>
                  <th className={tableStyles.textRight}>Aylık Aranma Sayısı</th>
                  <th>Envanter Durumu</th>
                </tr>
              </thead>
              <tbody>
                {demandReportData.map(item => (
                  <tr key={item.id}>
                    <td className={tableStyles.fontBold}>{item.searchTerm}</td>
                    <td className={`${tableStyles.textRight} ${tableStyles.fontBold}`}>{item.searchCount}</td>
                    <td>
                      <span style={{
                        color: item.inventoryStatus === 'Stokta Yok' ? 'var(--negative-color)' : 'var(--positive-color)',
                        fontWeight: 600
                      }}>
                        {item.inventoryStatus}
                      </span>
                    </td>
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