// src/app/(dashboard)/tekliflerim/OfferForm.tsx
'use client';

// ### OPTİMİZASYON: 'useCallback' import edildi ###
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useIMask, IMask } from 'react-imask';
import { MedicationItem } from '@/data/dashboardData';
import SettingsCard from '@/components/settings/SettingsCard';
// === DÜZELTME BURADA ===
// Hatalı yol: import formStyles from '@/app/ayarlar/profil/profil.module.css';
import formStyles from '@/app/(dashboard)/ayarlar/profil/profil.module.css'; // Yeni doğru yol
// =======================

interface OfferFormProps {
  medication?: MedicationItem;
  onSave: (formData: any) => void;
  isSaving?: boolean;
}

const OfferForm: React.FC<OfferFormProps> = ({ medication, onSave, isSaving }) => {
  const [formData, setFormData] = useState({
    productName: medication?.productName || '',
    barcode: medication?.barcode || '',
    stock: medication?.stock.split(' + ')[0] || '0',
    bonus: medication?.stock.split(' + ')[1] || '0',
    price: medication?.price ? String(medication.price).replace('.', ',') : '0',
  });

  // --- YENİ: SKT için ayrı state (YYYY-MM formatında) ---
  const [validSktYearMonth, setValidSktYearMonth] = useState<string | null>(() => {
    if (medication?.expirationDate) {
      const parts = medication.expirationDate.split('/');
      if (parts.length === 2) {
        return `20${parts[1]}-${parts[0].padStart(2, '0')}`;
      }
    }
    return null;
  });
  // --- SKT State Sonu ---

  // ### OPTİMİZASYON: 'onAccept' fonksiyonu useCallback içine alındı ###
  // Bu, IMask hook'unun gereksiz yere güncellenmesini engeller.
  const handleSktAccept = useCallback((value: string, mask: IMask.InputMask<any>) => {
      const unmasked = mask.unmaskedValue; // AAYYYY formatında
      if (unmasked.length === 6) {
          const month = unmasked.substring(0, 2);
          const year = unmasked.substring(2, 6);
          setValidSktYearMonth(`${year}-${month}`); // YYYY-MM state'ini güncelle
      } else {
          setValidSktYearMonth(null); // Tam değilse state'i null yap
      }
  }, []); // Bağımlılığı yok

  // --- IMask Hook ---
  const {
    ref: sktRef,
    setValue: setMaskedSktValue,
    maskRef,
  } = useIMask({
    mask: 'MM / YYYY',
    blocks: {
      MM: {
        mask: IMask.MaskedRange,
        from: 1,
        to: 12,
        maxLength: 2,
        autofix: true,
        placeholderChar: '_',
      },
      YYYY: {
        mask: IMask.MaskedRange,
        from: new Date().getFullYear(),
        to: new Date().getFullYear() + 20,
        maxLength: 4,
        placeholderChar: '_',
      },
    },
    lazy: false,
    overwrite: true,
  },
  {
      onAccept: handleSktAccept, // Memoize edilmiş fonksiyon kullanılıyor
  });
  // --- IMask Olayları Sonu ---

  // Başlangıçta veya `medication` değiştiğinde maskeyi ayarla
  useEffect(() => {
    if (medication?.expirationDate) {
      const parts = medication.expirationDate.split('/');
      if (parts.length === 2) {
        const initialValue = `${parts[0].padStart(2, '0')}/${`20${parts[1]}`}`;
        setMaskedSktValue(initialValue); // Maskelenmiş değeri ayarla
        setValidSktYearMonth(`20${parts[1]}-${parts[0].padStart(2, '0')}`);
      } else {
          setMaskedSktValue('');
          setValidSktYearMonth(null);
      }
    } else {
      setMaskedSktValue('');
      setValidSktYearMonth(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medication, setMaskedSktValue]); // setMaskedSktValue stabil olduğu için eklenebilir


  // ### OPTİMİZASYON: useCallback ###
  // Input Değişikliklerini Yönetme (SKT hariç)
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;

    if (id === 'expirationDate') return; // SKT'yi atla

    if (id === 'price') {
        let val = value.replace(/[^0-9,]/g, '');
        const parts = val.split(',');
        if (parts.length > 2) val = `${parts[0]},${parts[1]}`;
        setFormData(prev => ({ ...prev, [id]: val }));
    } else if (id === 'stock' || id === 'bonus' || id === 'barcode') {
        // Barkod, stok ve bonus için sadece rakamları al
        const numericValue = value.replace(/[^0-9]/g, '');
        setFormData(prev => ({ ...prev, [id]: numericValue }));
    } else {
      // Diğer alanlar (productName)
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  }, []); // Bağımlılığı yok


  // ### OPTİMİZASYON: useCallback ###
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    const isMaskComplete = maskRef.current?.masked.isComplete ?? false;

    if (!validSktYearMonth || !isMaskComplete) {
      alert("Lütfen geçerli bir Son Kullanma Tarihi girin (AA / YYYY). Maskenin tam dolduğundan emin olun.");
      if (sktRef.current) {
         setTimeout(() => sktRef.current?.focus(), 0);
      }
      return;
    }

    // SKT geçmiş tarihli mi kontrolü
    const today = new Date();
    const inputDate = new Date(`${validSktYearMonth}-01T00:00:00`);
    const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (inputDate < startOfCurrentMonth) {
      alert("Son Kullanma Tarihi, içinde bulunulan aydan veya geçmiş bir aydan olamaz.");
       if (sktRef.current) {
           setTimeout(() => sktRef.current?.focus(), 0);
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
  }, [formData, validSktYearMonth, maskRef, sktRef, onSave, medication]); // Bağımlı olduğu tüm state ve prop'lar

  return (
    <form onSubmit={handleSubmit}>
      <SettingsCard
        title={medication ? "Teklifi Düzenle" : "Yeni Teklif Ekle"}
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
              disabled={!!medication} // Düzenleme modunda ilaç adı değiştirilemez
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
            />
          </div>

          <div className={formStyles.formGroup}>
            <label htmlFor="expirationDate">Son Kullanma Tarihi (AA / YYYY) *</label>
            <input
              ref={sktRef}
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
              placeholder="0"
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
              placeholder="0"
            />
          </div>
        </div>
      </SettingsCard>
    </form>
  );
};

export default OfferForm;