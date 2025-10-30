// src/app/(dashboard)/tekliflerim/[offerId]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
// DÜZELTME: dashboard.css yolunu (dashboard) içine al
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from '../tekliflerim.module.css';

// ANA BİLEŞENLER
import OfferForm from '../OfferForm'; 

// BİLDİRİM & MESAJ BİLEŞENLERİ (TÜMÜ SİLİNDİ)

// VERİLER
import {
  userMedicationsData,
  MedicationItem
} from '@/data/dashboardData';

// Tipler (TÜMÜ SİLİNDİ)

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;

export default function DuzenleTeklifPage() {
  const router = useRouter();
  const params = useParams();
  const { offerId } = params as { offerId: string };

  const [medicationToEdit, setMedicationToEdit] = useState<MedicationItem | null | undefined>(undefined); 

  useEffect(() => {
      console.log(`API Çağrısı: ${offerId} ID'li teklif detayları getiriliyor...`);
      setTimeout(() => {
          const foundMedication = userMedicationsData.find(m => m.id.toString() === offerId);
          setMedicationToEdit(foundMedication || null);
      }, 300);
  }, [offerId]);

  // --- Bildirim/Mesaj/Sepet State'leri SİLİNDİ ---
  // --- Handler Fonksiyonları SİLİNDİ ---

  // --- Form Kaydetme Durumu ---
  const [isSaving, setIsSaving] = useState(false);

  // --- Form Kaydetme Fonksiyonu (Simülasyon) ---
  const handleUpdateOffer = async (formData: any) => {
      if (!medicationToEdit) return;
      setIsSaving(true);
      console.log(`API Çağrısı: ${offerId} ID'li teklif güncelleniyor...`, formData);
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Teklif başarıyla güncellendi.");
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
            <h1 className={styles.pageTitle}>Teklifi Düzenle</h1>
            <Link href="/tekliflerim" className={styles.primaryButton} style={{backgroundColor: 'var(--text-secondary)'}}>
              <BackIcon />
              <span>Geri Dön</span>
            </Link>
          </div>

          {medicationToEdit === undefined && <p>Teklif yükleniyor...</p>}
          {medicationToEdit === null && <p>Düzenlenecek teklif bulunamadı.</p>}
          {medicationToEdit && (
            <OfferForm
                medication={medicationToEdit}
                onSave={handleUpdateOffer}
                isSaving={isSaving}
            />
          )}
        </div>
    //   </main> // SİLİNDİ
    //   {/* --- Panel ve Modal Alanı SİLİNDİ --- */}
    // </div> // SİLİNDİ
  );
}