// src/app/(dashboard)/tekliflerim/yeni/page.tsx
'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from '../tekliflerim.module.css'; // üst bar stilleri için

// ANA BİLEŞEN
import OfferForm from '../OfferForm'; // Tamamen yenilenen form bileşeni
import { offerService } from '@/services/offerService';


const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;

// Suspense içinde sarmalamak için içeriği ayırıyoruz
// Bu, OfferForm'un içindeki useSearchParams'in çalışmasını sağlar
const NewOfferFormContent = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Real API integration
  const handleSave = async (data: any) => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        alert('Lütfen giriş yapın.');
        router.push('/login');
        return;
      }

      // Map offerType to backend OfferType enum
      const offerTypeMap: Record<string, string> = {
        'standard': 'Standard',
        'campaign': 'Campaign',
        'tender': 'Tender'
      };

      const payload = {
        offerType: offerTypeMap[data.offerType] || 'Standard',
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

        // Pharmacy Specific
        targetPharmacyId: data.targetPharmacyId
      };

      await offerService.createOffer(token, payload);
      
      // ✅ Invalidate offers cache so the list refreshes immediately
      await queryClient.invalidateQueries({ queryKey: ['offers'] });
      
      router.push('/tekliflerim?success=true');
      
    } catch (error: any) {
      console.error('Error creating offer:', error);
      alert(`Hata: ${error.message || 'Teklif oluşturulamadı'}`);
    }
  };

  return (
    <>
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