// src/app/(dashboard)/envanterim/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './envanterim.module.css'; // Yeni CSS dosyası

// Yeni konumundan import et
import FullInventoryTable from './FullInventoryTable'; 

// VERİLER
import {
  userMedicationsData, // Teklifleri de almamız gerek (karşılaştırma için)
  fullInventoryData, // Bu, Eczanem'den gelen tüm envanter
  MedicationItem
} from '@/data/dashboardData';

// İkon
const SyncIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>;

export default function EnvanterimPage() {

  // --- State Yönetimi ---
  const [offers, setOffers] = useState<MedicationItem[]>([]);
  const [inventory, setInventory] = useState<MedicationItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  
  // --- Veri Yükleme (Simülasyon) ---
  useEffect(() => {
    console.log("Genel envanter ve mevcut teklifler yükleniyor...");
    setTimeout(() => {
        setOffers(userMedicationsData); // Teklifte olanları bilmek için
        setInventory(fullInventoryData); // Tüm envanteri yükle
        setIsLoading(false);
        console.log("Envanter yüklendi.");
    }, 500);
  }, []);

  // Hangi ilaçların zaten teklif olarak eklendiğini bilmek için bir Set oluştur
  const offerBarcodeSet = useMemo(() => {
      return new Set(offers.map(offer => offer.barcode));
  }, [offers]);

  // Envanter Eşitleme Simülasyonu
  const handleSyncInventory = async () => {
      setIsLoading(true);
      console.log("API Çağrısı: Eczanem uygulamasından envanter eşitleniyor...");
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Simülasyon: Yeni bir veri ekle
      const newItem: MedicationItem = {
        id: 99,
        productName: "Yeni Eşitlenen İlaç",
        barcode: '9999999999999',
        stock: '50 + 0',
        costPrice: 100.00,
        price: 120.00,
        expirationDate: '12/2028',
        status: 'active', 
        dateAdded: new Date().toISOString().split('T')[0],
      };
      setInventory(prev => [newItem, ...prev]);
      setIsLoading(false);
      alert("Envanter başarıyla eşitlendi!");
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Genel Envanterim</h1>
        
        <button onClick={handleSyncInventory} className={styles.primaryButton} disabled={isLoading}>
          <SyncIcon />
          <span>{isLoading ? 'Yükleniyor...' : 'Eczanem ile Eşitle'}</span>
        </button>
      </div>

      <div>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>Genel envanter yükleniyor...</div>
        ) : (
          <FullInventoryTable
              data={inventory}
              offerBarcodeSet={offerBarcodeSet}
          />
        )}
      </div>
    </div>
  );
}