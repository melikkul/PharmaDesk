// src/app/(dashboard)/tekliflerim/[offerId]/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from '../tekliflerim.module.css';

// ANA BİLEŞENLER
import OfferForm from '../OfferForm'; // Yenilenen ana form

// VERİLER
import { userMedicationsData, MedicationItem } from '@/lib/dashboardData';
import { useAuth } from '@/store/AuthContext';
import { offerService } from '@/services/offerService';

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;

export default function DuzenleTeklifPage() {
  const router = useRouter();
  const params = useParams();
  const { offerId } = params as { offerId: string };

  const [medicationToEdit, setMedicationToEdit] = useState<MedicationItem | null | undefined>(undefined); 
  const [isSaving, setIsSaving] = useState(false);

  const { token } = useAuth(); // Auth token for API calls

  useEffect(() => {
      if (!offerId || !token) return;

      const fetchOffer = async () => {
          try {
              const data: any = await offerService.getOfferById(offerId);
              
              // Map API response to MedicationItem format expected by OfferForm
              const medicationItem: MedicationItem = {
                  id: data.id,
                  productName: data.productName,
                  stock: data.stock, // "100 + 10" format
                  price: data.price,
                  expirationDate: '', // Backend doesn't return expiration date in OfferDto yet, assuming empty or handled in form
                  status: data.status as any,
                  dateAdded: '', // Not needed for form
                  barcode: '', // Not needed for form
              };
              
              setMedicationToEdit(medicationItem);
          } catch (err) {
              console.error('Error fetching offer:', err);
              setMedicationToEdit(null);
          }
      };

      fetchOffer();
  }, [offerId, token]);

  // Form Kaydetme Fonksiyonu
  const handleUpdateOffer = useCallback(async (formData: any) => {
      if (!medicationToEdit || !token) return;
      setIsSaving(true);

      try {
          await offerService.updateOffer(token, offerId, formData);

          console.log("Teklif başarıyla güncellendi.");
          router.push('/tekliflerim');
      } catch (err) {
          console.error('Error updating offer:', err);
          alert('Güncelleme sırasında bir hata oluştu.');
      } finally {
          setIsSaving(false);
      }
  }, [medicationToEdit, offerId, router, token]);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Stoktan Teklifi Düzenle</h1>
        <Link href="/tekliflerim" className={styles.primaryButton} style={{backgroundColor: 'var(--text-secondary)'}}>
          <BackIcon />
          <span>Geri Dön</span>
        </Link>
      </div>

      {medicationToEdit === undefined && <p>Teklif yükleniyor...</p>}
      {medicationToEdit === null && <p>Düzenlenecek teklif bulunamadı.</p>}
      {medicationToEdit && (
        <OfferForm
            medication={medicationToEdit} // Düzenleme modunu tetikler
            onSave={handleUpdateOffer}
            isSaving={isSaving}
        />
      )}
    </div>
  );
}