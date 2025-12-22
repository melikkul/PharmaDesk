'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface Medication {
  id: number;
  name: string;
  barcode: string | null;
  manufacturer: string | null;
  basePrice: number;
  packageType: string | null;
  atc: string | null;
}

interface MedicationsResponse {
  data: Medication[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function DrugsPage() {
  const { api } = useAuth();
  
  // State
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;

  // ═══════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════

  const fetchMedications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await api.get<MedicationsResponse>(`/api/medications/paged?${params.toString()}`);
      setMedications(response.data.data);
      setTotalPages(response.data.totalPages);
      setTotalCount(response.data.totalCount);
    } catch (err: any) {
      console.error('Error fetching medications:', err);
      setError(err.response?.data?.message || 'İlaçlar yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [api, page, searchQuery]);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Ana İlaç Listesi</h1>
          <p className="text-text-secondary mt-1">Sistemdeki tüm ilaçları görüntüleyin</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-xl">
            <span className="text-2xl">💊</span>
            <div>
              <p className="text-xs text-text-secondary">Toplam İlaç</p>
              <p className="text-lg font-bold text-primary">{totalCount.toLocaleString('tr-TR')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-surface rounded-xl p-4 border border-border">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">🔍</span>
            <input
              type="text"
              placeholder="İlaç adı, barkod veya üretici ara..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border focus:border-primary outline-none"
            />
          </div>
          <button 
            onClick={() => { setSearchQuery(''); setPage(1); }}
            className="px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-background transition-colors"
          >
            Temizle
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-danger/10 text-danger p-4 rounded-lg">
          {error}
          <button onClick={fetchMedications} className="ml-4 underline">Tekrar Dene</button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-surface rounded-xl border border-border p-8">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-10 bg-background rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="p-4 font-semibold text-text-secondary text-sm">ID</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm">İlaç Adı</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm">Barkod</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm">Üretici</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm">ATC Kodu</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm">Ambalaj</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm text-right">Taban Fiyat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {medications.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-text-secondary">
                        {searchQuery ? 'Arama sonucu bulunamadı.' : 'İlaç bulunamadı.'}
                      </td>
                    </tr>
                  ) : (
                    medications.map((med) => (
                      <tr key={med.id} className="hover:bg-background/50 transition-colors">
                        <td className="p-4 font-mono text-sm text-primary">#{med.id}</td>
                        <td className="p-4 font-medium text-text-primary">{med.name}</td>
                        <td className="p-4 text-text-secondary font-mono text-sm">
                          {med.barcode || '-'}
                        </td>
                        <td className="p-4 text-text-secondary">{med.manufacturer || '-'}</td>
                        <td className="p-4">
                          {med.atc ? (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                              {med.atc}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="p-4 text-text-secondary text-sm">{med.packageType || '-'}</td>
                        <td className="p-4 text-right font-medium">{formatCurrency(med.basePrice)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-surface rounded-xl p-4 border border-border">
              <div className="text-sm text-text-secondary">
                Sayfa {page} / {totalPages} ({totalCount.toLocaleString('tr-TR')} kayıt)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-3 py-2 rounded-lg border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background transition-colors"
                >
                  ««
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background transition-colors"
                >
                  ← Önceki
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background transition-colors"
                >
                  Sonraki →
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="px-3 py-2 rounded-lg border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background transition-colors"
                >
                  »»
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}