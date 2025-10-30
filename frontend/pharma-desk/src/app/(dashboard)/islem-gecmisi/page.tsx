// src/app/(dashboard)/islem-gecmisi/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
// DÜZELTME: dashboard.css yolunu (dashboard) içine al
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './islem-gecmisi.module.css';

// ANA BİLEŞENLER
import HistoryTable from './HistoryTable';

// BİLDİRİM & MESAJ BİLEŞENLERİ (TÜMÜ SİLİNDİ)

// VERİLER
import {
  transactionHistoryData as initialTransactionHistory,
  TransactionHistoryItem
} from '@/data/dashboardData';

// Tipler (TÜMÜ SİLİNDİ)


export default function IslemGecmisiPage() {
  // --- Geçmiş State Yönetimi ---
  const [history, setHistory] = useState<TransactionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Yükleme durumu

  // --- Bildirim/Mesaj/Sepet State'leri SİLİNDİ ---
  // --- Handler Fonksiyonları SİLİNDİ ---

  // --- Veri Yükleme (Simülasyon) ---
  useEffect(() => {
    console.log("İşlem geçmişi yükleniyor...");
    setTimeout(() => {
        setHistory(initialTransactionHistory);
        setIsLoading(false);
        console.log("İşlem geçmişi yüklendi.");
    }, 500);
  }, []);

  return (
    // <div className="dashboard-container"> // SİLİNDİ
    //   <Sidebar /> // SİLİNDİ
    //   <Header /> // SİLİNDİ
    //   <main className="main-content"> // SİLİNDİ
        <div className={styles.pageContainer}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>İşlem Geçmişi</h1>
          </div>

          {isLoading ? (
             <div style={{ textAlign: 'center', padding: '50px' }}>İşlem geçmişi yükleniyor...</div>
          ) : (
            <HistoryTable data={history} />
          )}
        </div>
    //   </main> // SİLİNDİ
    //   {/* --- Panel ve Modal Alanı SİLİNDİ --- */}
    // </div> // SİLİNDİ
  );
}