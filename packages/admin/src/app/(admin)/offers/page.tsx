'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface Offer {
  id: number;
  medicationName: string;
  medicationBarcode: string | null;
  pharmacyName: string;
  pharmacyId: number;
  quantity: number;
  remainingQuantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  offerType: string;
  expiryDate: string | null;
  createdAt: string;
  isDeleted: boolean;
}

interface OffersResponse {
  data: Offer[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface Group {
  id: number;
  name: string;
  cityName: string;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function OffersPage() {
  const { api } = useAuth();
  
  // State
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;
  
  // Additional filters
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // ═══════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════

  // Fetch groups for filter dropdown
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await api.get('/api/groups');
        setGroups(response.data || []);
      } catch (err) {
        console.error('Error fetching groups:', err);
      }
    };
    fetchGroups();
  }, [api]);

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);
      if (selectedGroupId) params.append('groupId', selectedGroupId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get<OffersResponse>(`/api/admin/offers?${params.toString()}`);
      setOffers(response.data.data);
      setTotalPages(response.data.totalPages);
      setTotalCount(response.data.totalCount);
    } catch (err: any) {
      console.error('Error fetching offers:', err);
      setError(err.response?.data?.message || 'Teklifler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [api, page, searchQuery, statusFilter, selectedGroupId, startDate, endDate]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      Active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Aktif' },
      Passive: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Pasif' },
      Expired: { bg: 'bg-red-100', text: 'text-red-700', label: 'Süresi Doldu' },
      Sold: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Satıldı' },
    };
    const config = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getOfferTypeBadge = (type: string) => {
    const typeMap: Record<string, { bg: string; text: string; label: string }> = {
      StockSale: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Stok Satış' },
      JointOrder: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Ortak Sipariş' },
      PurchaseRequest: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Alım Talebi' },
    };
    const config = typeMap[type] || { bg: 'bg-gray-100', text: 'text-gray-600', label: type };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

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
          <h1 className="text-2xl font-bold text-text-primary">Tüm Teklifler</h1>
          <p className="text-text-secondary mt-1">Sistemdeki tüm teklifleri görüntüleyin ve yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Toplam:</span>
          <span className="text-lg font-bold text-primary">{totalCount}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-xl p-4 border border-border space-y-4">
        {/* Row 1: Search, Group, Status */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="İlaç veya eczane ara..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full px-4 py-2 rounded-lg border border-border focus:border-primary outline-none"
            />
          </div>
          <select
            value={selectedGroupId ?? ''}
            onChange={(e) => { setSelectedGroupId(e.target.value ? Number(e.target.value) : null); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-border focus:border-primary outline-none bg-surface min-w-[180px]"
          >
            <option value="">Tüm Gruplar</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.cityName})
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-lg border border-border focus:border-primary outline-none bg-surface"
          >
            <option value="">Tüm Durumlar</option>
            <option value="Active">Aktif</option>
            <option value="Passive">Pasif</option>
            <option value="Expired">Süresi Doldu</option>
            <option value="Sold">Satıldı</option>
          </select>
        </div>
        
        {/* Row 2: Date filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Tarih:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-border focus:border-primary outline-none"
            />
            <span className="text-text-secondary">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-border focus:border-primary outline-none"
            />
          </div>
          <button 
            onClick={() => { 
              setSearchQuery(''); 
              setStatusFilter(''); 
              setSelectedGroupId(null);
              setStartDate('');
              setEndDate('');
              setPage(1); 
            }}
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
          <button onClick={fetchOffers} className="ml-4 underline">Tekrar Dene</button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-surface rounded-xl border border-border p-8">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-background rounded animate-pulse"></div>
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
                    <th className="p-4 font-semibold text-text-secondary text-sm">İlaç</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm">Eczane</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm text-center">Tür</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm text-right">Miktar</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm text-right">Birim Fiyat</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm text-center">Durum</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm">SKT</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm">Oluşturulma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {offers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-text-secondary">
                        Teklif bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    offers.map((offer) => (
                      <tr 
                        key={offer.id} 
                        className={`hover:bg-background/50 transition-colors ${offer.isDeleted ? 'opacity-50' : ''}`}
                      >
                        <td className="p-4 font-mono text-sm text-primary">#{offer.id}</td>
                        <td className="p-4">
                          <div className="font-medium text-text-primary">{offer.medicationName}</div>
                          {offer.medicationBarcode && (
                            <div className="text-xs text-text-secondary">{offer.medicationBarcode}</div>
                          )}
                        </td>
                        <td className="p-4 text-text-primary">{offer.pharmacyName}</td>
                        <td className="p-4 text-center">{getOfferTypeBadge(offer.offerType)}</td>
                        <td className="p-4 text-right">
                          <div className="font-medium">{offer.remainingQuantity}</div>
                          <div className="text-xs text-text-secondary">/ {offer.quantity}</div>
                        </td>
                        <td className="p-4 text-right font-medium">{formatCurrency(offer.unitPrice)}</td>
                        <td className="p-4 text-center">
                          {offer.isDeleted ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Silindi</span>
                          ) : (
                            getStatusBadge(offer.status)
                          )}
                        </td>
                        <td className="p-4 text-text-secondary text-sm">{formatDate(offer.expiryDate)}</td>
                        <td className="p-4 text-text-secondary text-sm">{formatDate(offer.createdAt)}</td>
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
                Sayfa {page} / {totalPages} ({totalCount} kayıt)
              </div>
              <div className="flex gap-2">
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
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}