'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface PharmacyData {
  id: number;
  pharmacyname: string;
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
  const { api } = useAuth();

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

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-surface rounded w-1/4"></div>
        <div className="bg-surface rounded-xl h-96"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger/10 text-danger p-4 rounded-lg text-center">
        HATA: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Eczane Yönetimi</h1>
        <div className="flex gap-3">
          <input 
            type="text" 
            placeholder="Eczane ara..." 
            className="px-4 py-2 rounded-lg border border-border focus:border-primary outline-none w-64"
          />
          <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
            Filtrele
          </button>
        </div>
      </div>
      
      <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="p-4 font-semibold text-text-secondary text-sm">Eczane Adı</th>
                <th className="p-4 font-semibold text-text-secondary text-sm">E-posta</th>
                <th className="p-4 font-semibold text-text-secondary text-sm">Şehir / İlçe</th>
                <th className="p-4 font-semibold text-text-secondary text-sm text-right">Teklif Sayısı</th>
                <th className="p-4 font-semibold text-text-secondary text-sm text-right">Bakiye</th>
                <th className="p-4 font-semibold text-text-secondary text-sm text-center">Eylemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pharmacies.map(p => (
                <tr 
                  key={p.id} 
                  onClick={() => handleRowClick(p.id)} 
                  className="hover:bg-background/50 transition-colors cursor-pointer group"
                >
                  <td className="p-4 font-medium text-text-primary">{p.pharmacyname}</td>
                  <td className="p-4 text-text-secondary">{p.email}</td>
                  <td className="p-4 text-text-secondary">
                    <span className="px-2 py-1 bg-background rounded text-xs font-medium border border-border">
                      {p.city}
                    </span>
                    <span className="ml-2 text-xs text-text-secondary">{p.district}</span>
                  </td>
                  <td className="p-4 text-right font-medium text-text-primary">{p.offer_count}</td>
                  <td className={`p-4 text-right font-bold ${p.balance < 0 ? 'text-danger' : 'text-success'}`}>
                    {parseFloat(String(p.balance)).toFixed(2)} ₺
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRowClick(p.id); }}
                      className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded hover:bg-primary hover:text-white transition-all"
                    >
                      Yönet
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pharmacies.length === 0 && (
          <div className="p-8 text-center text-text-secondary">
            Kayıtlı eczane bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
}