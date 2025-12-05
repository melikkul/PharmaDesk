// src/app/(dashboard)/tekliflerim/page.tsx
'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './tekliflerim.module.css';

import { OfferInventoryTable } from '@/components/features/offers';
import Toast from '@/components/ui/Toast';

// ✅ Backend'den teklifleri çek
import { useMyOffers } from '@/hooks/useMyOffers';
import { useAuth } from '@/store/AuthContext';
import { OfferStatus } from '@/lib/dashboardData';
import { offerService } from '@/services/offerService';

const AddIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

export default function TekliflerimPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [showSuccessToast, setShowSuccessToast] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccessToast(true);
      // Clean up URL
      router.replace('/tekliflerim');
    }
  }, [searchParams, router]);
  
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
      } catch (err) {
          console.error('Error deleting offers:', err);
      }
  };

  const handleUpdateStatus = async (ids: number[], status: OfferStatus) => {
      console.log('[PAGE DEBUG] handleUpdateStatus called - ids:', ids, 'status:', status, 'token:', !!token);
      if (!token) {
          console.error('No token found');
          return;
      }

      try {
          for (const id of ids) {
              console.log('[PAGE DEBUG] Calling offerService.updateOfferStatus for id:', id);
              await offerService.updateOfferStatus(token, id, status.toLowerCase());
          }

          await refreshOffers();
          console.log('[PAGE DEBUG] Status update completed successfully');
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
    // New fields
    type: offer.type || 'stockSale',
    isPrivate: (offer as any).isPrivate || false,
    malFazlasi: (offer as any).malFazlasi || '0+0',
  }));

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tekliflerim</h1>
          <p className="text-sm text-gray-500 mt-1">
            Eczaneniz tarafından oluşturulan tüm satış tekliflerini buradan yönetebilirsiniz.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link 
            href="/tekliflerim/yeni" 
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm hover:shadow focus:ring-4 focus:ring-blue-100"
          >
            <AddIcon />
            <span>Yeni Teklif Oluştur</span>
          </Link>
        </div>
      </div>

      {showSuccessToast && (
        <div className="mb-6 animate-in slide-in-from-top-2">
          <Toast 
            message="Teklif başarıyla oluşturuldu!" 
            onClose={() => setShowSuccessToast(false)} 
          />
        </div>
      )}

      <div className="animate-in fade-in duration-500">
        {formattedOffers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AddIcon />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Henüz Teklifiniz Yok</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Stok fazlası ürünlerinizi satmak için hemen ilk teklifinizi oluşturun.
            </p>
            <Link 
              href="/tekliflerim/yeni" 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Teklif Oluştur
            </Link>
          </div>
        ) : (
          <OfferInventoryTable
              data={formattedOffers}
              token={token || ''}
              refreshOffers={refreshOffers}
          />
        )}
      </div>
    </div>
  );
}