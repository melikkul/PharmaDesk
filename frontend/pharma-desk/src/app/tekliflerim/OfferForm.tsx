// src/components/tekliflerim/OfferForm.tsx
'use client';

import React, { useState } from 'react';
import { MedicationItem } from '../../data/dashboardData';
import SettingsCard from '../../components/settings/SettingsCard';
// Ayarlar sayfasındaki form stillerini yeniden kullanıyoruz
import formStyles from '@/app/ayarlar/profil/profil.module.css'; 

interface OfferFormProps {
  medication?: MedicationItem; // Düzenleme modu için mevcut veri
}

const OfferForm: React.FC<OfferFormProps> = ({ medication }) => {
  const [formData, setFormData] = useState({
    productName: medication?.productName || '',
    stock: medication?.stock.split(' + ')[0] || '0',
    bonus: medication?.stock.split(' + ')[1] || '0',
    price: medication?.price || 0,
    expirationDate: medication?.expirationDate ? `20${medication.expirationDate.split('/')[1]}-${medication.expirationDate.split('/')[0]}` : '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // API'ye gönderme logic'i burada
    console.log("Form verisi:", formData);
    alert("Teklif Kaydedildi!");
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit}>
      <SettingsCard
        title={medication ? "Teklifi Düzenle" : "Yeni Teklif Ekle"}
        description="İlaç detaylarını, stok ve fiyat bilgilerini girin."
        footer={
          <button type="submit" className={`${formStyles.btn} ${formStyles.btnPrimary}`}>
            {medication ? "Değişiklikleri Kaydet" : "Teklifi Oluştur"}
          </button>
        }
      >
        <div className={formStyles.formGrid}>
          {/* Normalde burası tüm ilaçları aratabileceğimiz bir 
            "select" veya "autocomplete" bileşeni olmalı. 
            Şimdilik basitlik için metin girişi yapıyoruz.
          */}
          <div className={formStyles.formGroup}>
            <label htmlFor="productName">İlaç Adı</label>
            <input 
              type="text" 
              id="productName" 
              value={formData.productName} 
              onChange={handleInputChange}
              placeholder="Örn: Parol 500mg"
              required
            />
          </div>

          <div className={formStyles.formGroup}>
            <label htmlFor="expirationDate">Son Kullanma Tarihi (SKT)</label>
            <input 
              type="month" 
              id="expirationDate" 
              value={formData.expirationDate}
              onChange={handleInputChange}
              min={today.substring(0, 7)} // Sadece ay ve yıl
              required
            />
          </div>
          
          <div className={formStyles.formGroup}>
            <label htmlFor="price">Adet Fiyatı (₺)</label>
            <input 
              type="number" 
              id="price" 
              value={formData.price}
              onChange={handleInputChange}
              step="0.01" 
              min="0"
              required
            />
          </div>

          <div className={formStyles.formGroup}>
            <label htmlFor="stock">Stok (Adet)</label>
            <input 
              type="number" 
              id="stock" 
              value={formData.stock}
              onChange={handleInputChange}
              min="0"
              required
            />
          </div>

          <div className={formStyles.formGroup}>
            <label htmlFor="bonus">Mal Fazlası (MF)</label>
            <input 
              type="number" 
              id="bonus" 
              value={formData.bonus}
              onChange={handleInputChange}
              min="0"
              required
            />
          </div>
        </div>
      </SettingsCard>
    </form>
  );
};

export default OfferForm;