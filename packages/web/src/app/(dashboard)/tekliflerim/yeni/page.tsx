// src/app/(dashboard)/tekliflerim/yeni/page.tsx
'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from '../tekliflerim.module.css'; // üst bar stilleri için

// ANA BİLEŞEN
import OfferForm from '../OfferForm'; // Tamamen yenilenen form bileşeni

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;

// Suspense içinde sarmalamak için içeriği ayırıyoruz
// Bu, OfferForm'un içindeki useSearchParams'in çalışmasını sağlar
const NewOfferFormContent = () => {
  const router = useRouter();

  // Real API integration
  const handleSave = async (data: any) => {
    console.log("KAYDEDİLEN VERİ:", data);
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        alert('Lütfen giriş yapın.');
        router.push('/login');
        return;
      }

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
      
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
        expirationDate: data.expirationDate, // MM/YYYY format
        minOrderQuantity: data.minSaleQuantity,
        // Campaign fields
        campaignStartDate: data.campaignStartDate,
        campaignEndDate: data.campaignEndDate,
        // Tender fields  
        minimumOrderQuantity: data.minimumOrderQuantity,
        biddingDeadline: data.biddingDeadline,
        acceptingCounterOffers: data.acceptingCounterOffers
      };

      console.log('Sending to backend:', payload);

      const response = await fetch(`${API_BASE_URL}/api/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Teklif oluşturulamadı');
      }

      const result = await response.json();
      console.log('Offer created:', result);
      
      alert(`Teklif başarıyla oluşturuldu!`);
      router.push('/tekliflerim');
      
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