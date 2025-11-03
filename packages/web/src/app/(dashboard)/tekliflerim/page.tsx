// src/app/(dashboard)/tekliflerim/page.tsx
'use client';

// YENİ: useMemo ve useEffect kaldırıldı, sadece useState
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './tekliflerim.module.css';

// ANA BİLEŞEN
// YENİ: Sadece OffersTable import ediliyor
// DÜZELTME: Hatalı './OffersTable' importu './InventoryTable' olarak düzeltildi
import OffersTable from './InventoryTable'; 

// VERİLER
import {
  userMedicationsData as initialUserOffers, // Bu 'teklifler'
  MedicationItem, 
  OfferStatus 
} from '@/data/dashboardData';

// İkon
const AddIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

export default function TekliflerimPage() {
  const router = useRouter();

  // --- State Yönetimi ---
  // YENİ: Sadece 'offers' state'i kaldı
  const [offers, setOffers] = useState<MedicationItem[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);
  
  // --- Veri Yükleme (Simülasyon) ---
  useEffect(() => {
    // Sadece Teklifleri Yükle
    console.log("Teklifler yükleniyor...");
    setTimeout(() => {
        setOffers(initialUserOffers);
        setIsLoadingOffers(false);
        console.log("Teklifler yüklendi.");
    }, 300);
  }, []);

  // --- API Çağrı Simülasyonları (Teklifler için) ---
  const handleDeleteItems = async (ids: number[]) => {
      console.log(`API Çağrısı: ${ids.join(', ')} ID'li teklifler siliniyor...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      setOffers(prev => prev.filter(item => !ids.includes(item.id)));
      console.log(`${ids.length} teklif silindi.`);
  };

  const handleUpdateStatus = async (ids: number[], status: OfferStatus) => {
      console.log(`API Çağrısı: ${ids.join(', ')} ID'li tekliflerin durumu "${status}" olarak güncelleniyor...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      setOffers(prev =>
          prev.map(item =>
              ids.includes(item.id) ? { ...item, status: status } : item
          )
      );
      console.log(`${ids.length} teklifin durumu güncellendi.`);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        {/* YENİ: Başlık değişti */}
        <h1 className={styles.pageTitle}>Tekliflerim</h1>
        
        {/* Sadece 'Manuel Teklif Ekle' butonu kaldı */}
        <Link href="/tekliflerim/yeni" className={styles.primaryButton}>
          <AddIcon />
          <span>Teklif Ekle</span>
        </Link>
      </div>

      {/* YENİ: Sekme (Tab) yapısı kaldırıldı */}
      <div>
        {isLoadingOffers ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>Teklifler yükleniyor...</div>
        ) : (
          <OffersTable
              data={offers}
              onDeleteItems={handleDeleteItems}
              onUpdateStatus={handleUpdateStatus}
          />
        )}
      </div>
    </div>
  );
}