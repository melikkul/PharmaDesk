// src/app/(dashboard)/tekliflerim/page.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './tekliflerim.module.css';

import { OfferInventoryTable } from '@/components/features/offers';

// ✅ Backend'den teklifleri çek
import { useMyOffers } from '@/hooks/useMyOffers';
import { useAuth } from '@/store/AuthContext';
import { OfferStatus } from '@/lib/dashboardData';
import { offerService } from '@/services/offerService';

const AddIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

export default function TekliflerimPage() {
  const router = useRouter();
  const { token } = useAuth();
  
  // ✅ Backend'den teklifleri çek  
  const { offers, loading, error, refreshOffers } = useMyOffers();

  const handleDeleteItems = async (ids: number[]) => {
      if (!token) {
          console.error('No token found');
          return;
      }

      try {
          for (const id of ids) {
              await offerService.deleteOffer(token, id);
          }

          await refreshOffers();
          console.log(`${ids.length} teklif silindi.`);
      } catch (err) {
          console.error('Error deleting offers:', err);
      }
  };

  const handleUpdateStatus = async (ids: number[], status: OfferStatus) => {
      if (!token) {
          console.error('No token found');
          return;
      }

      try {
          for (const id of ids) {
              await offerService.updateOfferStatus(token, id, status.toLowerCase());
          }

          await refreshOffers();
          console.log(`${ids.length} teklifin durumu güncellendi.`);
      } catch (err) {
          console.error('Error updating offer status:', err);
      }
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '50px' }}>Teklifler yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>Hata: {error}</div>
      </div>
    );
  }

  // Convert API data (backend OfferDto) to expected format
  const formattedOffers = offers.map(offer => ({
    id: offer.id,
    productName: offer.productName || 'Bilinmiyor',
    barcode: offer.barcode || '',
    currentStock: 0,
    bonusStock: 0,
    costPrice: offer.price,
    stock: offer.stock,
    price: offer.price,
    dateAdded: new Date().toISOString(),
    expirationDate: offer.expirationDate || '',
    status: offer.status as any,
    alarmSet: false,
  }));

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tekliflerim</h1>
        
        <Link href="/tekliflerim/yeni" className={styles.primaryButton}>
          <AddIcon />
          <span>Teklif Ekle</span>
        </Link>
      </div>

      <div>
        {formattedOffers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>Henüz teklif bulunmuyor.</div>
        ) : (
          <OfferInventoryTable
              data={formattedOffers}
              onDeleteItems={handleDeleteItems}
              onUpdateStatus={handleUpdateStatus}
          />
        )}
      </div>
    </div>
  );
}