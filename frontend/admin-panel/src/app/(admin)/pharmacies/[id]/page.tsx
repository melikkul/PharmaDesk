'use client';

import React, { useState, useEffect, FormEvent, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import formStyles from '@/components/Form.module.css';
import tableStyles from '@/components/Table.module.css';

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string;
  created_at: string;
}
interface PharmacyDetails {
  id: number;
  pharmacyname: string;
  email: string;
  balance: number;
  city: string;
  district: string;
  location: string;
  transactions: Transaction[];
}

export default function PharmacyDetailPage() {
  const [pharmacy, setPharmacy] = useState<PharmacyDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const params = useParams();
  const router = useRouter();
  const { api } = useAuth();
  const id = params.id;

  const fetchPharmacy = useCallback(async () => {
     if (!id) return;
     setIsLoading(true);
     try {
       const { data } = await api.get(`/admin/pharmacies/${id}`);
       setPharmacy(data);
     } catch (err: any) {
       setError('Eczane detayı yüklenemedi.');
     }
     setIsLoading(false);
  }, [id, api]);

  useEffect(() => {
    fetchPharmacy();
  }, [fetchPharmacy]);

  const handleBalanceSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pharmacy) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      alert("Lütfen geçerli bir tutar girin (pozitif veya negatif).");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { data: updatedPharmacy } = await api.post(
        `/admin/pharmacies/${pharmacy.id}/balance`, 
        { amount: numAmount, description }
      );
      setPharmacy(updatedPharmacy); // Dönen güncel eczane bilgisiyle state'i güncelle
      alert("Bakiye başarıyla güncellendi!");
      setAmount('');
      setDescription('');
    } catch (err: any) {
      alert("Hata: " + (err.response?.data?.error || 'Bakiye güncellenemedi.'));
    }
    setIsSubmitting(false);
  };

  if (isLoading) return <div>Yükleniyor...</div>;
  if (error) return <div style={{ color: 'red' }}>HATA: {error}</div>;
  if (!pharmacy) return <div>Eczane bulunamadı.</div>;

  return (
    <div>
      <button onClick={() => router.push('/pharmacies')} style={{marginBottom: '20px', padding: '8px 12px', cursor: 'pointer'}}>&larr; Tüm Eczaneler</button>
      <h1 className="pageTitle">{pharmacy.pharmacyname}</h1>
      
      <div className={formStyles.card}>
        <h2>Eczane Bilgileri</h2>
        <p><strong>Email:</strong> {pharmacy.email}</p>
        <p><strong>Adres:</strong> {pharmacy.location}, {pharmacy.district} / {pharmacy.city}</p>
        <p><strong>MEVCUT BAKİYE:</strong> 
          <strong style={{fontSize: '24px', marginLeft: '10px', color: pharmacy.balance < 0 ? 'red' : 'green'}}>
            {parseFloat(String(pharmacy.balance)).toFixed(2)} ₺
          </strong>
        </p>
      </div>

      <div className={formStyles.card} style={{marginTop: '30px'}}>
        <h2>Manuel Bakiye Ekle/Düzelt</h2>
        <form onSubmit={handleBalanceSubmit}>
          <div className={formStyles.formGrid}>
            <div className={formStyles.formGroup}>
              <label htmlFor="amount">Tutar (Eksi değer için başına '-' koyun)</label>
              <input
                type="number"
                step="0.01"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Örn: 500.00 veya -50.00"
                required
              />
            </div>
            <div className={formStyles.formGroup}>
              <label htmlFor="description">Açıklama (Fatura No, Düzeltme, vb.)</label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Admin bakiye düzeltmesi"
                required
              />
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className={formStyles.btnPrimary} style={{marginTop: '10px'}}>
            {isSubmitting ? 'Kaydediliyor...' : 'Bakiye İşlemini Kaydet'}
          </button>
        </form>
      </div>
      
      <div className={formStyles.card} style={{marginTop: '30px'}}>
        <h2>İşlem Geçmişi</h2>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Tip</th>
              <th>Açıklama</th>
              <th className={tableStyles.textRight}>Tutar</th>
            </tr>
          </thead>
          <tbody>
            {pharmacy.transactions.length === 0 && (
              <tr><td colSpan={4} style={{textAlign: 'center'}}>İşlem geçmişi bulunamadı.</td></tr>
            )}
            {pharmacy.transactions.map(t => (
              <tr key={t.id}>
                <td>{new Date(t.created_at).toLocaleString('tr-TR')}</td>
                <td>{t.transaction_type}</td>
                <td>{t.description}</td>
                <td className={`${tableStyles.textRight} ${tableStyles.fontBold} ${t.amount < 0 ? tableStyles.textRed : tableStyles.textGreen}`}>
                  {t.amount > 0 ? '+' : ''}{parseFloat(String(t.amount)).toFixed(2)} ₺
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}