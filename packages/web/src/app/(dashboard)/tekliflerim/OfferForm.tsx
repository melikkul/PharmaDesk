// src/app/(dashboard)/tekliflerim/OfferForm.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useIMask, IMask } from 'react-imask';
import type { Masked } from 'imask';
import { MedicationItem } from '@/data/dashboardData';
import SettingsCard from '@/components/settings/SettingsCard';
import formStyles from '@/app/(dashboard)/ayarlar/profil/profil.module.css';

// YENİ: Form verisi için bir tip
type FormData = {
  productName: string;
  barcode: string;
  stock: string;
  bonus: string;
  price: string;
};

// YENİ: Opsiyonel defaultValues prop'u eklendi
interface OfferFormProps {
  medication?: MedicationItem; // Düzenleme için
  defaultValues?: Partial<FormData & { expirationDate: string }>; // Envanterden "Teklif Ver" için
  onSave: (formData: any) => void;
  isSaving?: boolean;
}

const OfferForm: React.FC<OfferFormProps> = ({ medication, defaultValues, onSave, isSaving }) => {
  
  // GÜNCELLENDİ: useState artık 'medication' (düzenleme) veya 'defaultValues' (yeni) kullanır
  const [formData, setFormData] = useState<FormData>({
    productName: medication?.productName || defaultValues?.productName || '',
    barcode: medication?.barcode || defaultValues?.barcode || '',
    stock: (medication?.stock.split(' + ')[0] || defaultValues?.stock) || '',
    bonus: (medication?.stock.split(' + ')[1] || defaultValues?.bonus) || '0', // Bonus varsayılan 0 olsun
    price: (medication?.price ? String(medication.price).replace('.', ',') : defaultValues?.price) || '',
  });

  // GÜNCELLENDİ: SKT için başlangıç değeri
  const [validSktYearMonth, setValidSktYearMonth] = useState<string | null>(() => {
    const skt = medication?.expirationDate || defaultValues?.expirationDate;
    if (skt) {
      const parts = skt.split('/');
      if (parts.length === 2) {
        return `20${parts[1]}-${parts[0].padStart(2, '0')}`;
      }
    }
    return null;
  });

  const {
    ref: sktRef,
    setValue: setMaskedSktValue,
    maskRef,
  } = useIMask<HTMLInputElement>({
    mask: 'MM / YYYY',
    blocks: {
      MM: { mask: IMask.MaskedRange, from: 1, to: 12, maxLength: 2, autofix: true, placeholderChar: '_' },
      YYYY: { mask: IMask.MaskedRange, from: new Date().getFullYear(), to: new Date().getFullYear() + 20, maxLength: 4, placeholderChar: '_' },
    },
    lazy: true,
    overwrite: true,
  });

  const handleSktAccept = useCallback(() => {
      const mask = maskRef.current;
      if (!mask) return;
      const unmasked = mask.unmaskedValue; // AAYYYY
      if (unmasked.length === 6) {
          const month = unmasked.substring(0, 2);
          const year = unmasked.substring(2, 6);
          setValidSktYearMonth(`${year}-${month}`); 
      } else {
          setValidSktYearMonth(null); 
      }
  }, [maskRef]);

  useEffect(() => {
    maskRef.current?.on('accept', handleSktAccept);
    return () => {
      maskRef.current?.off('accept', handleSktAccept);
    }
  }, [handleSktAccept, maskRef]);

  // Başlangıçta veya `medication` değiştiğinde maskeyi ayarla
  useEffect(() => {
    const skt = medication?.expirationDate || defaultValues?.expirationDate;
    if (skt) {
      const parts = skt.split('/');
      if (parts.length === 2) {
        const initialValue = `${parts[0].padStart(2, '0')}/${defaultValues ? parts[1] : `20${parts[1]}`}`; // defaultValues YYYY formatında gelebilir
        // YYYY-MM formatından (envanter) gelen SKT'yi düzelt
        if(defaultValues?.expirationDate) {
           setMaskedSktValue(defaultValues.expirationDate); 
           const [m, y] = defaultValues.expirationDate.split('/');
           setValidSktYearMonth(`20${y}-${m.padStart(2, '0')}`);
        } else if (medication?.expirationDate) {
           setMaskedSktValue(initialValue);
           setValidSktYearMonth(`20${parts[1]}-${parts[0].padStart(2, '0')}`);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medication, defaultValues, setMaskedSktValue]);


  // Input Değişikliklerini Yönetme (SKT hariç)
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    if (id === 'expirationDate') return; 

    if (id === 'price') {
        let val = value.replace(/[^0-9,]/g, '');
        const parts = val.split(',');
        if (parts.length > 2) val = `${parts[0]},${parts[1]}`;
        setFormData(prev => ({ ...prev, [id]: val }));
    } else if (id === 'stock' || id === 'bonus' || id === 'barcode') {
        const numericValue = value.replace(/[^0-9]/g, '');
        setFormData(prev => ({ ...prev, [id]: numericValue }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  }, []); 


  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!validSktYearMonth) {
      alert("Lütfen geçerli bir Son Kullanma Tarihi girin (AA / YYYY). Maskenin tam dolduğundan emin olun.");
      if (maskRef.current) {
         setTimeout(() => (maskRef.current?.el as unknown as HTMLElement)?.focus(), 0);
      }
      return;
    }

    const today = new Date();
    const inputDate = new Date(`${validSktYearMonth}-01T00:00:00`);
    const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (inputDate < startOfCurrentMonth) {
      alert("Son Kullanma Tarihi, içinde bulunulan aydan veya geçmiş bir aydan olamaz.");
       if (maskRef.current) {
           setTimeout(() => (maskRef.current?.el as unknown as HTMLElement)?.focus(), 0);
      }
      return;
    }

    const priceAsNumber = parseFloat(formData.price.replace(',', '.')) || 0;
    if (priceAsNumber <= 0) {
      alert("Lütfen geçerli bir Birim Fiyatı girin.");
      return;
    }

    const [year, month] = validSktYearMonth.split('-');
    const formattedExpirationDate = `${month}/${year.substring(2)}`; // MM/YY

    const dataToSave = {
      ...formData,
      expirationDate: formattedExpirationDate,
      price: priceAsNumber,
      stock: parseInt(formData.stock, 10) || 0,
      bonus: parseInt(formData.bonus, 10) || 0,
      ...(medication?.id && { id: medication.id }),
    };

    onSave(dataToSave);
  }, [formData, validSktYearMonth, maskRef, onSave, medication]);


  return (
    <form onSubmit={handleSubmit}>
      <SettingsCard
        title={medication ? "Teklifi Düzenle" : "Yeni Teklif Oluştur"}
        description="İlaç detaylarını, stok, fiyat ve barkod bilgilerini girin."
        footer={
          <button type="submit" className={`${formStyles.btn} ${formStyles.btnPrimary}`} disabled={isSaving}>
            {isSaving ? 'Kaydediliyor...' : (medication ? "Değişiklikleri Kaydet" : "Teklifi Oluştur")}
          </button>
        }
      >
        <div className={formStyles.formGrid}>
          <div className={formStyles.formGroup}>
            <label htmlFor="productName">İlaç Adı *</label>
            <input
              type="text"
              id="productName"
              value={formData.productName}
              onChange={handleInputChange}
              placeholder="Örn: Parol 500mg Tablet"
              required
              disabled={!!medication || !!defaultValues?.productName} // Düzenleme veya envanterden ekleme modunda değiştirilemez
            />
          </div>

          <div className={formStyles.formGroup}>
            <label htmlFor="barcode">Barkod (Karekod/ITS)</label>
            <input
              type="text"
              id="barcode"
              value={formData.barcode}
              onChange={handleInputChange}
              placeholder="İlacın barkodunu girin (Sadece Rakam)"
              maxLength={13}
              pattern="\d*"
              inputMode='numeric'
              disabled={!!medication || !!defaultValues?.barcode} // Düzenleme veya envanterden ekleme modunda değiştirilemez
            />
          </div>

          <div className={formStyles.formGroup}>
            <label htmlFor="expirationDate">Son Kullanma Tarihi (AA / YYYY) *</label>
            <input
              ref={sktRef} // Bu ref <input>'a bağlanır
              type="text"
              id="expirationDate"
              placeholder="AA / YYYY"
              required
            />
          </div>

          <div className={formStyles.formGroup}>
            <label htmlFor="price">Birim Fiyatı (₺) *</label>
            <input
              type="text"
              id="price"
              value={formData.price}
              onChange={handleInputChange}
              inputMode="decimal"
              required
              placeholder="0,00"
            />
          </div>

          <div className={formStyles.formGroup}>
            <label htmlFor="stock">Stok (Adet) *</label>
            <input
              type="text"
              id="stock"
              value={formData.stock}
              onChange={handleInputChange}
              inputMode="numeric"
              min="0"
              required
              placeholder="Örn: 10"
            />
          </div>

          <div className={formStyles.formGroup}>
            <label htmlFor="bonus">Mal Fazlası (MF)</label>
            <input
              type="text"
              id="bonus"
              value={formData.bonus}
              onChange={handleInputChange}
              inputMode="numeric"
              min="0"
              required
              placeholder="Örn: 1"
            />
          </div>
        </div>
      </SettingsCard>
    </form>
  );
};

export default OfferForm;