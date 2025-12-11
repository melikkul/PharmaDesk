// src/app/(dashboard)/tekliflerim/yeni/page.tsx
'use client';

import React, { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from '../tekliflerim.module.css'; // üst bar stilleri için

// ANA BİLEŞEN
import OfferForm from '../OfferForm'; // Tamamen yenilenen form bileşeni
import { offerService } from '@/services/offerService';


const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;

// 🆕 Suggestion Modal Interface
interface SuggestionData {
  hasSuggestion: boolean;
  suggestedOfferId: number;
  suggestedMedicationId: number;
  suggestedOfferType?: string; // 'jointorder' or 'purchaserequest'
  barem?: string;
  message: string;
  remainingStock: number;
  pharmacyName: string;
}

// Suspense içinde sarmalamak için içeriği ayırıyoruz
// Bu, OfferForm'un içindeki useSearchParams'in çalışmasını sağlar
const NewOfferFormContent = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // 🆕 Suggestion Modal State
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [suggestionData, setSuggestionData] = useState<SuggestionData | null>(null);
  
  // 🆕 Error Toast State
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Real API integration
  const handleSave = async (data: any) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        alert('Lütfen giriş yapın.');
        router.push('/login');
        return;
      }

      // Form'dan gelen type değerini doğrudan kullan (stockSale, jointOrder, purchaseRequest)
      // NOT: OfferForm artık data.type ile doğru değeri gönderiyor

      const payload = {
        type: data.type || data.offerType, // Backend expects 'type' field
        productName: data.productName,
        barcode: data.barcode,
        price: data.price,
        stock: data.stock,
        bonusQuantity: data.bonus,
        minSaleQuantity: data.minSaleQuantity,
        expirationDate: data.expirationDate, // MM/YYYY format
        
        // New fields
        depotPrice: data.depotPrice,
        malFazlasi: data.malFazlasi,
        discountPercentage: data.discountPercentage,
        maxSaleQuantity: data.maxSaleQuantity,
        description: data.description,

        // Campaign fields
        campaignStartDate: data.campaignStartDate,
        campaignEndDate: data.campaignEndDate,
        campaignBonusMultiplier: data.campaignBonusMultiplier,
        
        // Tender fields  
        minimumOrderQuantity: data.minimumOrderQuantity,
        biddingDeadline: data.biddingDeadline,
        acceptingCounterOffers: data.acceptingCounterOffers,

        // Private offer fields
        isPrivate: data.isPrivate,
        targetPharmacyIds: data.targetPharmacyIds,
        warehouseBaremId: data.warehouseBaremId,
        maxPriceLimit: data.maxPriceLimit,

        // Pharmacy Specific (legacy)
        targetPharmacyId: data.targetPharmacyId
      };

      const result = await offerService.createOffer(token, payload);
      
      // 🆕 Handle smart matching suggestion
      if (!result.success && result.suggestion) {
        setSuggestionData(result.suggestion);
        setShowSuggestionModal(true);
        return;
      }
      
      // ✅ Invalidate offers cache so the list refreshes immediately
      await queryClient.invalidateQueries({ queryKey: ['offers'] });
      
      router.push('/tekliflerim?success=true');
      
    } catch (error: any) {
      console.error('Error creating offer:', error);
      setErrorToast(`⚠️ ${error.message || 'Teklif oluşturulamadı'}`);
      setTimeout(() => setErrorToast(null), 5000);
    }
  };

  // 🆕 Handle redirect to suggested offer
  const handleGoToSuggested = () => {
    if (suggestionData) {
      const offerType = suggestionData.suggestedOfferType || 'jointorder';
      const baremParam = suggestionData.barem ? `&barem=${encodeURIComponent(suggestionData.barem)}` : '';
      router.push(`/ilaclar/${suggestionData.suggestedMedicationId}?type=${offerType}${baremParam}&offerId=${suggestionData.suggestedOfferId}`);
    }
  };

  return (
    <>
      {/* 🆕 Error Toast - Sağ üst köşe */}
      {errorToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          padding: '14px 20px',
          backgroundColor: '#fef2f2',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          fontSize: '14px',
          fontWeight: '600',
          color: '#b91c1c',
          animation: 'slideIn 0.3s ease-out',
          maxWidth: '400px'
        }}>
          {errorToast}
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}
      
      {/* 🆕 Suggestion Modal */}
      {showSuggestionModal && suggestionData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            {/* Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#fef3c7',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '32px'
            }}>
              🎯
            </div>
            
            {/* Title */}
            <h2 style={{
              textAlign: 'center',
              fontSize: '20px',
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: '12px'
            }}>
              {suggestionData.suggestedOfferType === 'purchaserequest' 
                ? 'Mevcut Alım Talebi Bulundu!' 
                : 'Mevcut Ortak Sipariş Bulundu!'}
            </h2>
            
            {/* Message */}
            <p style={{
              textAlign: 'center',
              fontSize: '15px',
              color: '#6b7280',
              lineHeight: '1.6',
              marginBottom: '16px'
            }}>
              {suggestionData.message}
            </p>
            
            {/* Warning about save block */}
            <p style={{
              textAlign: 'center',
              fontSize: '14px',
              color: '#dc2626',
              fontWeight: '600',
              marginBottom: '24px',
              padding: '8px 12px',
              backgroundColor: '#fef2f2',
              borderRadius: '8px'
            }}>
              ⛔ Bu teklif kaydedilmeyecek.
            </p>
            
            {/* Info Box */}
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>Eczane</span>
                <span style={{ color: '#1f2937', fontWeight: '600', fontSize: '14px' }}>{suggestionData.pharmacyName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>Kalan Stok</span>
                <span style={{ color: '#16a34a', fontWeight: '700', fontSize: '16px' }}>{suggestionData.remainingStock} Adet</span>
              </div>
            </div>
            
            {/* Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleGoToSuggested}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <span>📍</span>
              İlana Git
              </button>
              
              <button
                onClick={() => setShowSuggestionModal(false)}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Yeni İlan Oluştur</h1>
        <Link href="/tekliflerim" className={styles.primaryButton} style={{backgroundColor: 'var(--text-secondary)'}}>
          <BackIcon />
          <span>İlanlarıma Geri Dön</span>
        </Link>
      </div>

      <OfferForm 
        onSave={handleSave} 
        // Düzenleme modu için 'medication' prop'u (yeni sayfada boş)
        // Envanterden gelme 'defaultValues' prop'u (OfferForm kendi içinde halledecek)
      />
    </>
  );
}

export default function YeniTeklifPage() {
  return (
    // useSearchParams'in (OfferForm içinde) çalışması için Suspense wrapper'ı gereklidir
    <Suspense fallback={<div>Form yükleniyor...</div>}>
      <NewOfferFormContent />
    </Suspense>
  );
}