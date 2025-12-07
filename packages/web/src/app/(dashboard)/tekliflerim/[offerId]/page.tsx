// src/app/(dashboard)/tekliflerim/[offerId]/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();

  const [medicationToEdit, setMedicationToEdit] = useState<MedicationItem | null | undefined>(undefined); 
  const [isSaving, setIsSaving] = useState(false);
  const [offerType, setOfferType] = useState<string>('stockSale'); // 🆕 Track offer type for title

  const { token } = useAuth(); // Auth token for API calls

  // 🆕 Dynamic page title based on offer type
  const pageTitle = useMemo(() => {
    switch (offerType.toLowerCase()) {
      case 'stocksale':
        return 'Stok Satışı Teklifini Düzenle';
      case 'jointorder':
        return 'Ortak Sipariş Teklifini Düzenle';
      case 'purchaserequest':
        return 'Alım Talebini Düzenle';
      default:
        return 'Teklifi Düzenle';
    }
  }, [offerType]);

  useEffect(() => {
      if (!offerId || !token) return;

      const fetchOffer = async () => {
          try {
              const data: any = await offerService.getOfferById(token, offerId);
              
              // 🆕 Set offer type for page title
              setOfferType(data.type || 'stockSale');
              
              // Map API response to MedicationItem format expected by OfferForm
              const medicationItem: MedicationItem & { medicationId?: number; offerType?: string } = {
                  id: data.id, // Offer ID
                  medicationId: data.medicationId, // Medication ID for barem fetch
                  productName: data.productName,
                  stock: data.stock, // "100 + 10" format
                  price: data.price,
                  expirationDate: data.expirationDate || '', // Use API response
                  status: data.status as any,
                  dateAdded: '', // Not needed for form
                  barcode: data.barcode || '', // Use barcode from API
                  offerType: data.type, // 🆕 Pass offer type for edit mode
              };
              
              setMedicationToEdit(medicationItem);
          } catch (err: any) {
              console.error('Error fetching offer:', err);
              
              // Handle 403 Forbidden - user is not the owner
              if (err?.status === 403 || err?.message?.includes('403')) {
                  alert('Bu teklifi düzenleme yetkiniz bulunmamaktadır. Sadece kendi tekliflerinizi düzenleyebilirsiniz.');
                  router.push('/tekliflerim');
                  return;
              }
              
              setMedicationToEdit(null);
          }
      };

      fetchOffer();
  }, [offerId, token, router]);

  // Form Kaydetme Fonksiyonu
  const handleUpdateOffer = useCallback(async (formData: any) => {
      if (!medicationToEdit || !token) return;
      setIsSaving(true);

      try {
          await offerService.updateOffer(token, offerId, formData);
          
          // Invalidate offers cache to ensure list shows fresh data
          await queryClient.invalidateQueries({ queryKey: ['offers'] });

          console.log("Teklif başarıyla güncellendi.");
          router.push('/tekliflerim');
      } catch (err) {
          console.error('Error updating offer:', err);
          alert('Güncelleme sırasında bir hata oluştu.');
      } finally {
          setIsSaving(false);
      }
  }, [medicationToEdit, offerId, router, token, queryClient]);

  // State for barem data from API
  const [offerBaremData, setOfferBaremData] = useState<{warehouseBaremId?: string; malFazlasi?: string}>({});

  // Update fetchOffer to capture barem data
  useEffect(() => {
      if (!offerId || !token) return;

      const fetchOfferData = async () => {
          try {
              const data: any = await offerService.getOfferById(token, offerId);
              
              // Store barem data for pre-selection
              setOfferBaremData({
                  warehouseBaremId: data.warehouseBaremId?.toString(),
                  malFazlasi: data.malFazlasi
              });
          } catch (err) {
              console.error('Error fetching barem data:', err);
          }
      };

      fetchOfferData();
  }, [offerId, token]);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
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
            initialBaremId={offerBaremData.warehouseBaremId}
            initialMalFazlasi={offerBaremData.malFazlasi}
        />
      )}
    </div>
  );
}