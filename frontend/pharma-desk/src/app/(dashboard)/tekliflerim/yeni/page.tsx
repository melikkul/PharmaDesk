// src/app/(dashboard)/tekliflerim/yeni/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// DÜZELTME: dashboard.css yolunu (dashboard) içine al
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from '../tekliflerim.module.css';

// ANA BİLEŞENLER
import OfferForm from '../OfferForm'; 

// BİLDİRİM & MESAJ BİLEŞENLERİ (TÜMÜ SİLİNDİ)

// VERİLER (TÜMÜ SİLİNDİ, sadece OfferForm'un ihtiyacı olanlar kaldı)

// Tipler (TÜMÜ SİLİNDİ)

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;

export default function YeniTeklifPage() {
  const router = useRouter();

  // --- Bildirim/Mesaj/Sepet State'leri SİLİNDİ ---
  // --- Handler Fonksiyonları SİLİNDİ ---

  // --- Form Kaydetme Durumu ---
  const [isSaving, setIsSaving] = useState(false);

  // --- Form Kaydetme Fonksiyonu (Simülasyon) ---
  const handleSaveOffer = async (formData: any) => {
      setIsSaving(true);
      console.log("API Çağrısı: Yeni teklif kaydediliyor...", formData);
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Yeni teklif başarıyla kaydedildi.");
      setIsSaving(false);
      router.push('/tekliflerim');
  };

  return (
    // <div className="dashboard-container"> // SİLİNDİ
    //   <Sidebar /> // SİLİNDİ
    //   <Header /> // SİLİNDİ
    //   <main className="main-content"> // SİLİNDİ
        <div className={styles.pageContainer}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Yeni Teklif Ekle</h1>
            <Link href="/tekliflerim" className={styles.primaryButton} style={{backgroundColor: 'var(--text-secondary)'}}>
              <BackIcon />
              <span>Geri Dön</span>
            </Link>
          </div>

          <OfferForm onSave={handleSaveOffer} isSaving={isSaving} />
        </div>
    //   </main> // SİLİNDİ
    //   {/* --- Panel ve Modal Alanı SİLİNDİ --- */}
    // </div> // SİLİNDİ
  );
}