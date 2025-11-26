// src/app/(dashboard)/tekliflerim/page.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './tekliflerim.module.css';

import OffersTable from './InventoryTable';

// ✅ Backend'den teklifleri çek
import { useMyOffers } from '@/hooks/useMyOffers';
import { useAuth } from '@/store/AuthContext'; // Import useAuth
import { OfferStatus } from '@/lib/dashboardData';
import { offerService } from '@/services/offerService';

const AddIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

export default function TekliflerimPage() {
  const router = useRouter();
  const { token } = useAuth(); // Get token from context
  
  // ✅ Backend'den teklifleri çek  
  const { offers, loading, error, refreshOffers } = useMyOffers();

  const handleDeleteItems = async (ids: number[]) => {
      if (!token) {
          console.error('No token found');
          return;
      }

      try {
          // Delete each offer
          for (const id of ids) {
              await offerService.deleteOffer(token, id);
          }

          // Refresh offers list
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
          // Update status for each offer
          for (const id of ids) {
              await offerService.updateOfferStatus(token, id, status.toLowerCase());
          }

          // Refresh offers list
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
    productName: offer.productName || 'Bilinmiyor', // Backend OfferDto already has productName
    barcode: offer.barcode || '', // Use actual barcode from backend
    currentStock: 0,
    bonusStock: 0,
    costPrice: offer.price,
    stock: offer.stock, // "50 + 5" formatında zaten
    price: offer.price,
    dateAdded: new Date().toISOString(),
    expirationDate: offer.expirationDate || '', // Use actual SKT from backend
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
          <OffersTable
              data={formattedOffers}
              onDeleteItems={handleDeleteItems}
              onUpdateStatus={handleUpdateStatus}
          />
        )}
      </div>
    </div>
  );
}