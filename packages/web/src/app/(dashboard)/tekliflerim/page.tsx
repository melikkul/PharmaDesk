// src/app/(dashboard)/tekliflerim/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// DÜZELTME: dashboard.css yolunu (dashboard) içine al
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './tekliflerim.module.css';

// ANA BİLEŞENLER
import InventoryTable from './InventoryTable'; 

// BİLDİRİM & MESAJ BİLEŞENLERİ (TÜMÜ SİLİNDİ)

// VERİLER
import {
  userMedicationsData as initialUserMedications,
  MedicationItem, 
  OfferStatus 
} from '@/data/dashboardData';

// Tipler (TÜMÜ SİLİNDİ)

// İkonlar
const AddIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

export default function TekliflerimPage() {
  const router = useRouter();

  // --- Envanter State Yönetimi ---
  const [inventory, setInventory] = useState<MedicationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Bildirim/Mesaj/Sepet State'leri SİLİNDİ ---
  // --- Handler Fonksiyonları SİLİNDİ ---

  // --- Veri Yükleme (Simülasyon) ---
  useEffect(() => {
    console.log("Teklifler yükleniyor...");
    setTimeout(() => {
        setInventory(initialUserMedications);
        setIsLoading(false);
        console.log("Teklifler yüklendi.");
    }, 500);
  }, []);

  // --- API Çağrı Simülasyonları ---
  const handleDeleteItems = async (ids: number[]) => {
      console.log(`API Çağrısı: ${ids.join(', ')} ID'li teklifler siliniyor...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      setInventory(prev => prev.filter(item => !ids.includes(item.id)));
      console.log(`${ids.length} teklif silindi.`);
  };

  const handleUpdateStatus = async (ids: number[], status: OfferStatus) => {
      console.log(`API Çağrısı: ${ids.join(', ')} ID'li tekliflerin durumu "${status}" olarak güncelleniyor...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      setInventory(prev =>
          prev.map(item =>
              ids.includes(item.id) ? { ...item, status: status } : item
          )
      );
      console.log(`${ids.length} teklifin durumu güncellendi.`);
  };

  return (
    // <div className="dashboard-container"> // SİLİNDİ
    //   <Sidebar /> // SİLİNDİ
    //   <Header /> // SİLİNDİ
    //   <main className="main-content"> // SİLİNDİ
        <div className={styles.pageContainer}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Tekliflerim / Envanter</h1>
            <Link href="/tekliflerim/yeni" className={styles.primaryButton}>
              <AddIcon />
              <span>Yeni Teklif Ekle</span>
            </Link>
          </div>

          {isLoading ? (
             <div style={{ textAlign: 'center', padding: '50px' }}>Teklifler yükleniyor...</div>
          ) : (
            <InventoryTable
                data={inventory}
                onDeleteItems={handleDeleteItems}
                onUpdateStatus={handleUpdateStatus}
            />
          )}
        </div>
    //   </main> // SİLİNDİ
    //   {/* --- Panel ve Modal Alanı SİLİNDİ --- */}
    // </div> // SİLİNDİ
  );
}