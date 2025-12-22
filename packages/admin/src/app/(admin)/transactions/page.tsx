'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface Transaction {
  id: number;
  date: string;
  type: string;
  description: string | null;
  sender: string;
  receiver: string;
  amount: number;
  status: string;
}

interface TransactionsSummary {
  totalVolume: number;
  todayCount: number;
  completedCount: number;
  pendingCount: number;
}

interface TransactionsResponse {
  data: Transaction[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: TransactionsSummary;
}

// ═══════════════════════════════════════════════════════════════
// STAT CARD COMPONENT
// ═══════════════════════════════════════════════════════════════

const StatCard = ({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) => (
  <div className="bg-surface p-5 rounded-xl shadow-sm border border-border flex items-center justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-text-secondary text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-text-primary">{value}</h3>
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${color}`}>
      {icon}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

interface Group {
  id: number;
  name: string;
  cityName: string;
}

export default function TransactionsPage() {
  const { api } = useAuth();
  
  // State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;
  
  // Filters
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
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

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (searchQuery) params.append('search', searchQuery);
      if (selectedGroupId) params.append('groupId', selectedGroupId.toString());
      if (selectedType) params.append('type', selectedType);
      if (selectedStatus) params.append('status', selectedStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get<TransactionsResponse>(`/api/admin/transactions?${params.toString()}`);
      setTransactions(response.data.data);
      setSummary(response.data.summary);
      setTotalPages(response.data.totalPages);
      setTotalCount(response.data.totalCount);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      setError(err.response?.data?.message || 'İşlemler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [api, page, searchQuery, selectedGroupId, selectedType, selectedStatus, startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      Completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Tamamlandı' },
      Pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Bekliyor' },
      Cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'İptal' },
      Failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Başarısız' },
      Captured: { bg: 'bg-green-100', text: 'text-green-700', label: 'Onaylandı' },
    };
    const config = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { bg: string; text: string; label: string }> = {
      Sale: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Satış' },
      Purchase: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Alış' },
      Deposit: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Para Yatırma' },
      Withdrawal: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Para Çekme' },
      Refund: { bg: 'bg-red-100', text: 'text-red-700', label: 'İade' },
      Commission: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Komisyon' },
      Subscription: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Abonelik' },
      OfferCreated: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Teklif Oluşturuldu' },
      OfferDeleted: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Teklif Silindi' },
      Captured: { bg: 'bg-green-100', text: 'text-green-700', label: 'Onaylandı' },
    };
    const config = typeMap[type] || { bg: 'bg-gray-100', text: 'text-gray-600', label: type };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Tüm İşlemler</h1>
          <p className="text-text-secondary mt-1">Sistemdeki tüm finansal işlemleri görüntüleyin</p>
        </div>
        <button className="px-4 py-2 bg-surface border border-border rounded-lg text-text-secondary hover:text-primary transition-colors text-sm font-medium flex items-center gap-2">
          📥 Excel İndir
        </button>
      </div>

      {/* Summary Stats Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Toplam Hacim"
            value={formatCurrency(summary.totalVolume)}
            icon="💰"
            color="bg-emerald-100"
          />
          <StatCard
            title="Bugünkü İşlemler"
            value={summary.todayCount}
            icon="📅"
            color="bg-blue-100"
          />
          <StatCard
            title="Tamamlanan"
            value={summary.completedCount}
            icon="✅"
            color="bg-green-100"
          />
          <StatCard
            title="Bekleyen"
            value={summary.pendingCount}
            icon="⏳"
            color="bg-yellow-100"
          />
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-surface rounded-xl p-4 border border-border space-y-4">
        {/* Row 1: Search, Group */}
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Eczane veya açıklama ara..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full px-4 py-2 rounded-lg border border-border focus:border-primary outline-none"
            />
          </div>
          <div className="min-w-[180px]">
            <select
              value={selectedGroupId ?? ''}
              onChange={(e) => { setSelectedGroupId(e.target.value ? Number(e.target.value) : null); setPage(1); }}
              className="w-full px-4 py-2 rounded-lg border border-border focus:border-primary outline-none bg-white"
            >
              <option value="">Tüm Gruplar</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.cityName})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Row 2: Type, Status, Dates */}
        <div className="flex gap-4 items-center flex-wrap">
          <div className="min-w-[150px]">
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
              className="w-full px-4 py-2 rounded-lg border border-border focus:border-primary outline-none bg-white"
            >
              <option value="">Tüm Türler</option>
              <option value="Sale">Satış</option>
              <option value="Purchase">Alış</option>
              <option value="Deposit">Para Yatırma</option>
              <option value="Withdrawal">Para Çekme</option>
              <option value="Refund">İade</option>
              <option value="Commission">Komisyon</option>
              <option value="Subscription">Abonelik</option>
              <option value="OfferCreated">Teklif Oluşturuldu</option>
              <option value="OfferDeleted">Teklif Silindi</option>
              <option value="Captured">Onaylandı</option>
            </select>
          </div>
          <div className="min-w-[150px]">
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              className="w-full px-4 py-2 rounded-lg border border-border focus:border-primary outline-none bg-white"
            >
              <option value="">Tüm Durumlar</option>
              <option value="Completed">Tamamlandı</option>
              <option value="Pending">Bekliyor</option>
              <option value="Cancelled">İptal</option>
              <option value="Failed">Başarısız</option>
              <option value="Captured">Onaylandı</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-border focus:border-primary outline-none"
              placeholder="Başlangıç"
            />
            <span className="text-text-secondary">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-border focus:border-primary outline-none"
              placeholder="Bitiş"
            />
          </div>
          <button 
            onClick={() => { 
              setSearchQuery(''); 
              setSelectedGroupId(null); 
              setSelectedType('');
              setSelectedStatus('');
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
          <button onClick={fetchTransactions} className="ml-4 underline">Tekrar Dene</button>
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
                    <th className="p-4 font-semibold text-text-secondary text-sm">Tarih</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm">Tür</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm">Gönderen</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm">Alıcı</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm">Açıklama</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm text-right">Tutar</th>
                    <th className="p-4 font-semibold text-text-secondary text-sm text-center">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-text-secondary">
                        İşlem bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-background/50 transition-colors">
                        <td className="p-4 text-text-secondary text-sm">{tx.date}</td>
                        <td className="p-4">{getTypeBadge(tx.type)}</td>
                        <td className="p-4 font-medium text-text-primary">{tx.sender}</td>
                        <td className="p-4 font-medium text-text-primary">{tx.receiver}</td>
                        <td className="p-4 text-text-secondary text-sm max-w-xs truncate">
                          {tx.description || '-'}
                        </td>
                        <td className={`p-4 text-right font-bold ${tx.amount >= 0 ? 'text-success' : 'text-danger'}`}>
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="p-4 text-center">{getStatusBadge(tx.status)}</td>
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