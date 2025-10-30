// src/app/(dashboard)/raporlar/page.tsx
'use client';

import React from 'react';
// DÜZELTME: dashboard.css yolunu (dashboard) içine al
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './raporlar.module.css';

// ANA BİLEŞENLER
import ReportCard from '@/components/raporlar/ReportCard';

// BİLDİRİM & MESAJ BİLEŞENLERİ (TÜMÜ SİLİNDİ)
// VERİLER (TÜMÜ SİLİNDİ)
// Tipler (TÜMÜ SİLİNDİ)

// GÜNCELLENMİŞ Rapor Listesi
const reportList = [
  {
    title: 'Finansal Özet Raporu',
    description: 'Belirli bir dönemdeki toplam ciro, maliyet ve net kârınızı grafiksel olarak görün.',
    icon: 'sales', 
    link: '/raporlar/ozet'
  },
  {
    title: 'Envanter Değer Raporu',
    description: 'Mevcut stoklarınızın toplam maliyetini, satış değerini ve kategori dağılımını analiz edin.',
    icon: 'inventory',
    link: '/raporlar/envanter'
  },
  {
    title: 'Miad Raporu',
    description: 'Miadı yaklaşan ilaçlarınızı listeleyin ve miad kaybını önlemek için strateji belirleyin.',
    icon: 'expiry',
    link: '/raporlar/miad'
  },
  {
    title: 'Teklif Performans Raporu',
    description: 'Hangi tekliflerinizin popüler olduğunu ve satışa dönüşme oranlarını ölçün.',
    icon: 'performance',
    link: '/raporlar/performans'
  },
  {
    title: 'Piyasa Talep Raporu',
    description: 'Sistemde aranan ama sizde olmayan ilaçları görerek talebi keşfedin.',
    icon: 'demand',
    link: '/raporlar/talep'
  },
];


export default function RaporlarPage() {
  // --- Bildirim/Mesaj/Sepet State'leri SİLİNDİ ---
  // --- Handler Fonksiyonları SİLİNDİ ---

  return (
    // <div className="dashboard-container"> // SİLİNDİ
    //   <Sidebar /> // SİLİNDİ
    //   <Header /> // SİLİNDİ
    //   <main className="main-content"> // SİLİNDİ
        <div className={styles.pageContainer}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Raporlarım</h1>
          </div>

          <div className={styles.reportGrid}>
            {reportList.map((report) => (
              <ReportCard
                key={report.link}
                title={report.title}
                description={report.description}
                icon={report.icon}
                link={report.link}
              />
            ))}
          </div>

        </div>
    //   </main> // SİLİNDİ
    //   {/* --- Panel ve Modal Alanı SİLİNDİ --- */}
    // </div> // SİLİNDİ
  );
}