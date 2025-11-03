// src/app/(dashboard)/tekliflerim/yeni/page.tsx
'use client';

// YENİ: useSearchParams eklendi
import React, { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from '../tekliflerim.module.css';

// ANA BİLEŞENLER
import OfferForm from '../OfferForm'; 

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;


// Formu Suspense içinde sarmalamak için içeriği ayırıyoruz
const NewOfferFormContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL'den gelen varsayılan değerleri al
  const defaultValues = {
    productName: searchParams.get('isim') || '',
    barcode: searchParams.get('barkod') || '',
    stock: searchParams.get('stok') || '',
    bonus: searchParams.get('mf') || '',
    price: (searchParams.get('maliyet') || '0').replace('.', ','), // Maliyeti fiyat olarak ayarla
    expirationDate: searchParams.get('skt') || '',
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveOffer = useCallback(async (formData: any) => {
      setIsSaving(true);
      console.log("API Çağrısı: Yeni teklif kaydediliyor...", formData);
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Yeni teklif başarıyla kaydedildi.");
      setIsSaving(false);
      // Teklifi kaydettikten sonra envanter yerine teklifler sekmesine yönlendir
      router.push('/tekliflerim'); 
  }, [router]);

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          {defaultValues.productName ? `"${defaultValues.productName}" için Teklif Oluştur` : "Yeni Teklif Ekle"}
        </h1>
        {/* GÜNCELLENDİ: Link '/envanterim' olarak değişti */}
        <Link href="/envanterim" className={styles.primaryButton} style={{backgroundColor: 'var(--text-secondary)'}}>
          <BackIcon />
          <span>Envantere Geri Dön</span>
        </Link>
      </div>

      <OfferForm 
        onSave={handleSaveOffer} 
        isSaving={isSaving} 
        defaultValues={defaultValues} // Yakalanan değerleri forma ilet
      />
    </>
  );
}


export default function YeniTeklifPage() {
  return (
    // useSearchParams'in çalışması için Suspense wrapper'ı gereklidir
    <Suspense fallback={<div>Form yükleniyor...</div>}>
      <NewOfferFormContent />
    </Suspense>
  );
}