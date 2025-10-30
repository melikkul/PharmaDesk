'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import tableStyles from '@/components/Table.module.css';
import filterStyles from '@/components/Filter.module.css';

// API'den gelecek eczane verisi tipi
interface PharmacyData {
  id: number;
  pharmacyname: string; // DB'den gelen ad (küçük harf olabilir)
  email: string;
  phone: string;
  balance: number;
  offer_count: number;
  city: string;
  district: string;
}

export default function PharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<PharmacyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const { api } = useAuth(); // Context'ten token'lı api instance'ını al

  useEffect(() => {
    const fetchPharmacies = async () => {
      setIsLoading(true);
      setError('');
      try {
        const { data } = await api.get('/admin/pharmacies');
        setPharmacies(data);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.error || 'Eczaneler yüklenemedi.');
      }
      setIsLoading(false);
    };
    fetchPharmacies();
  }, [api]);

  const handleRowClick = (id: number) => {
    router.push(`/pharmacies/${id}`);
  };

  if (isLoading) return <div>Eczaneler yükleniyor...</div>;
  if (error) return <div style={{ color: 'red' }}>HATA: {error}</div>;

  return (
    <div>
      <h1 className="pageTitle">Eczane Yönetimi</h1>
      
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '25px', overflowX: 'auto' }}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>Eczane Adı</th>
              <th>E-posta</th>
              <th>Şehir / İlçe</th>
              <th className={tableStyles.textRight}>Teklif Sayısı</th>
              <th className={tableStyles.textRight}>Bakiye</th>
              <th>Eylemler</th>
            </tr>
          </thead>
          <tbody>
            {pharmacies.map(p => (
              <tr key={p.id} onClick={() => handleRowClick(p.id)} style={{ cursor: 'pointer' }}>
                <td className={tableStyles.fontBold}>{p.pharmacyname}</td>
                <td>{p.email}</td>
                <td>{p.city} / {p.district}</td>
                <td className={tableStyles.textRight}>{p.offer_count}</td>
                <td className={`${tableStyles.textRight} ${tableStyles.fontBold} ${p.balance < 0 ? tableStyles.textRed : tableStyles.textGreen}`}>
                  {parseFloat(String(p.balance)).toFixed(2)} ₺
                </td>
                <td>
                  <button onClick={(e) => { e.stopPropagation(); handleRowClick(p.id); }} className={filterStyles.clearButton} style={{padding: '5px 10px'}}>
                    Yönet
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}