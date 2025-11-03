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

  // Kaydetme simülasyonu
  const handleSave = async (data: any) => {
    console.log("KAYDEDİLEN VERİ:", data);
    alert(`"${data.offerType}" türünde ilan oluşturuldu!`);
    
    // Gerçekte burada data.offerType'a göre farklı API endpoint'lerine istek atılır
    // Örn: /api/offers/stock, /api/offers/group-buy, /api/offers/request
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Başarı sonrası yönlendirme
    if (data.offerType === 'stock') {
      router.push('/tekliflerim');
    } else {
      // Diğer türler için "Taleplerim" veya "Ortak Alımlarım" sayfası olabilir
      router.push('/dashboard'); 
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