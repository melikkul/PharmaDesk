// src/app/(dashboard)/transferlerim/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// DÜZELTME: dashboard.css yolunu (dashboard) içine al
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './transferlerim.module.css';

// ANA BİLEŞENLER
import TransfersTable from './TransfersTable'; // Yeni Tablo Bileşeni

// VERİLER
import {
  shipmentsData as initialShipmentsData,
  ShipmentItem
} from '@/data/dashboardData';

// Tipler
// Diğer tüm tipler ve bileşenler (Sidebar, Header, SlidePanel vb.) layout'tan geldiği için SİLİNDİ.


export default function TransferlerimPage() {
  const router = useRouter();

  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Bildirim/Mesaj/Sepet State'leri SİLİNDİ ---
  // --- Handler Fonksiyonları SİLİNDİ ---
  // (Tümü (dashboard)/layout.tsx ve useDashboardPanels hook'u tarafından yönetiliyor)

  // --- Veri Yükleme (Simülasyon) ---
  useEffect(() => {
    // API çağrısı simülasyonu
    setTimeout(() => {
        setShipments(initialShipmentsData);
        setIsLoading(false);
    }, 500);
  }, []);

  return (
    // <div className="dashboard-container"> // SİLİNDİ
    //   <Sidebar /> // SİLİNDİ
    //   <Header /> // SİLİNDİ
    //   <main className="main-content"> // SİLİNDİ
        <div className={styles.pageContainer}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Transferlerim (Kargo Takibi)</h1>
          </div>

          {isLoading ? (
             <div style={{ textAlign: 'center', padding: '50px' }}>Transferler yükleniyor...</div>
          ) : (
            <TransfersTable data={shipments} />
          )}
        </div>
    //   </main> // SİLİNDİ
    //   {/* --- Panel ve Modal Alanı SİLİNDİ --- */}
    // </div> // SİLİNDİ
  );
}