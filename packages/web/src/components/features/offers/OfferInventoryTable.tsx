// src/components/features/offers/OfferInventoryTable.tsx
'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MedicationItem, OfferStatus } from '@/lib/dashboardData';
import { PriceDisplay, StatusBadge, DateDisplay } from '@/components/common';
import { 
  Edit2, Trash2, PauseCircle, PlayCircle, Filter, 
  ArrowUp, ArrowDown, ArrowUpDown, MoreVertical, CheckSquare, Square,
  Lock, Globe, X
} from 'lucide-react';
import { offerService } from '@/services/offerService';
import Toast from '@/components/ui/Toast';

// Helper function to translate offer type
const translateOfferType = (type: string): string => {
  switch (type?.toLowerCase()) {
    case 'stocksale': return 'Stok Satışı';
    case 'jointorder': return 'Ortak Sipariş';
    case 'purchaserequest': return 'Alım Talebi';
    case 'standard': return 'Stok Satışı'; // Legacy
    case 'campaign': return 'Kampanya';
    case 'tender': return 'İhale';
    default: return type || 'Bilinmiyor';
  }
};

// --- Types ---
type SortField = keyof MedicationItem | null;
type SortDirection = 'asc' | 'desc';

interface FilterState {
    searchTerm: string;
    status: OfferStatus | '';
    expireMonths: number | ''; 
}

interface OffersTableProps {
  data: MedicationItem[];
  token: string;
  refreshOffers: () => Promise<unknown>;
}

const ITEMS_PER_PAGE = 10; 

// --- Helper Functions ---
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 2) {
    const year = parseInt(`20${parts[1]}`, 10);
    const month = parseInt(parts[0], 10) - 1; 
    return new Date(year, month, 1);
  } else if (dateStr.includes('-')) {
    return new Date(dateStr);
  }
  return null;
};

const OffersTable: React.FC<OffersTableProps> = ({
    data,
    token,
    refreshOffers
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false); 
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>('dateAdded');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    status: '',
    expireMonths: '',
  });
  
  // NEW: State for 3-dot menu, confirmation modal, and toast
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: number; name: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Click outside handler for dropdown menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        // Check if click is on a menu button
        const target = e.target as Element;
        if (!target.closest('[data-menu-button]')) {
          setActiveMenuId(null);
          setMenuPosition(null);
        }
      }
    };
    if (activeMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenuId]);

  // --- Filtering & Sorting ---
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data];

    if (filters.searchTerm) {
        const lowerSearchTerm = filters.searchTerm.toLowerCase();
        filtered = filtered.filter(item =>
            item.productName.toLowerCase().includes(lowerSearchTerm) ||
            (item.barcode && item.barcode.includes(lowerSearchTerm))
        );
    }
    if (filters.status) {
        filtered = filtered.filter(item => item.status === filters.status);
    }
    if (filters.expireMonths !== '') {
      const months = Number(filters.expireMonths);
      if (!isNaN(months) && months >= 0) {
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + months);
        targetDate.setDate(1); 
        targetDate.setHours(0, 0, 0, 0); 
        filtered = filtered.filter(item => {
          const expDate = parseDate(item.expirationDate);
          return expDate && expDate >= new Date() && expDate <= targetDate;
        });
      }
    }

    if (sortField) {
      filtered.sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        
        if (sortField === 'expirationDate' || sortField === 'dateAdded') {
          valA = parseDate(valA as string)?.getTime() || 0;
          valB = parseDate(valB as string)?.getTime() || 0;
        } else if (sortField === 'price' || sortField === 'stock') {
             if (sortField === 'stock') {
                 valA = parseInt((valA as string).split(' ')[0], 10) || 0;
                 valB = parseInt((valB as string).split(' ')[0], 10) || 0;
             } else {
                 valA = Number(valA);
                 valB = Number(valB);
             }
        } else {
             valA = String(valA).toLowerCase();
             valB = String(valB).toLowerCase();
        }
        
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [data, filters, sortField, sortDirection]);

  // --- Pagination ---
  const totalPages = Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedData, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    setSelectedIds([]); 
  }, []);

  // --- Selection ---
  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedData.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  }, [paginatedData]);

  const handleSelectItem = useCallback((id: number, checked: boolean) => {
    setSelectedIds(prev =>
      checked ? [...prev, id] : prev.filter(itemId => itemId !== id)
    );
  }, []);

  // --- Sorting Helper ---
  const renderSortIcon = useCallback((field: keyof MedicationItem) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-blue-600" /> 
      : <ArrowDown className="w-4 h-4 text-blue-600" />;
  }, [sortField, sortDirection]);

  const handleSort = useCallback((field: keyof MedicationItem) => {
    setSortField(prevField => {
      if (prevField === field) {
        setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
        return field;
      } else {
        setSortDirection('asc');
        return field;
      }
    });
     setCurrentPage(1);
  }, []);

  // --- Filters ---
  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  }, []); 

  const clearFilters = useCallback(() => {
    setFilters({ searchTerm: '', status: '', expireMonths: '' });
    setCurrentPage(1);
  }, []); 

  // --- Actions ---
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`${selectedIds.length} adet teklifi kalıcı olarak silmek istediğinizden emin misiniz?`)) {
        setIsProcessing(true);
        const idsToDelete = [...selectedIds];
        
        try {
          for (const id of idsToDelete) {
            await offerService.deleteOffer(token, id);
          }
          await refreshOffers();
          setSelectedIds([]);
        } catch (error) {
          console.error("Toplu silme başarısız:", error);
        } finally {
          setIsProcessing(false);
        }
    }
  };

  const handleBatchUpdateStatus = async (status: OfferStatus) => {
      if (selectedIds.length === 0) return;
      const statusText = status === 'active' ? 'aktif' : 'pasif';
      if (window.confirm(`${selectedIds.length} adet teklifin durumunu "${statusText}" olarak güncellemek istediğinizden emin misiniz?`)) {
        setIsProcessing(true);
        const idsToUpdate = [...selectedIds];
        
        try {
          for (const id of idsToUpdate) {
            await offerService.updateOfferStatus(token, id, status.toLowerCase());
          }
          await refreshOffers();
          setSelectedIds([]);
        } catch (error) {
          console.error("Toplu durum güncelleme başarısız:", error);
        } finally {
          setIsProcessing(false);
        }
    }
  };

  // Opens confirmation modal for single delete
  const openDeleteConfirmation = (id: number, name: string) => {
    setActiveMenuId(null);
    setDeleteConfirmation({ id, name });
  };

  // Actual delete handler called from confirmation modal
  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;
    setIsProcessing(true);
    try {
      await offerService.deleteOffer(token, deleteConfirmation.id);
      await refreshOffers();
      setSelectedIds(prev => prev.filter(itemId => itemId !== deleteConfirmation.id));
      setToastMessage({ text: 'Teklif başarıyla silindi!', type: 'success' });
    } catch (error) {
      console.error("Silme başarısız:", error);
      setToastMessage({ text: 'Silme işlemi başarısız!', type: 'error' });
    } finally {
      setIsProcessing(false);
      setDeleteConfirmation(null);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: OfferStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    const statusText = newStatus === 'active' ? 'aktif' : 'pasif';
    setActiveMenuId(null);
    setIsProcessing(true);
    try {
      await offerService.updateOfferStatus(token, id, newStatus);
      await refreshOffers();
      setToastMessage({ text: `Teklif ${statusText} duruma getirildi!`, type: 'success' });
    } catch (error) {
      console.error("Durum güncelleme başarısız:", error);
      setToastMessage({ text: 'Durum güncellenemedi!', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle dropdown menu for a row with position calculation
  const toggleMenu = (id: number, buttonElement?: HTMLButtonElement) => {
    if (activeMenuId === id) {
      setActiveMenuId(null);
      setMenuPosition(null);
    } else {
      const button = buttonElement || buttonRefs.current.get(id);
      if (button) {
        const rect = button.getBoundingClientRect();
        setMenuPosition({
          top: rect.bottom + 4,
          right: window.innerWidth - rect.right,
        });
      }
      setActiveMenuId(id);
    }
  };


  return (
    <>
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        
        {/* Header & Filters */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Search & Filter Toggle */}
                <div className="flex items-center gap-3 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <input
                            type="text"
                            name="searchTerm"
                            placeholder="İlaç adı veya barkod ara..."
                            value={filters.searchTerm}
                            onChange={handleFilterChange}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2.5 rounded-lg border transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        title="Filtreler"
                    >
                        <Filter className="w-5 h-5" />
                    </button>
                </div>

                {/* Batch Actions */}
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                        <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-md">
                            {selectedIds.length} seçildi
                        </span>
                        <div className="h-6 w-px bg-gray-300 mx-1"></div>
                        <button type="button" onClick={() => handleBatchUpdateStatus('active')} disabled={isProcessing} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Aktif Et">
                            <PlayCircle className="w-5 h-5" />
                        </button>
                        <button type="button" onClick={() => handleBatchUpdateStatus('paused')} disabled={isProcessing} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Pasif Et">
                            <PauseCircle className="w-5 h-5" />
                        </button>
                        <button type="button" onClick={() => handleBatchDelete()} disabled={isProcessing} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Sil">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Expanded Filters */}
            {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
                    <select
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                        <option value="">Tüm Durumlar</option>
                        <option value="active">Aktif</option>
                        <option value="paused">Pasif</option>
                        <option value="out_of_stock">Stokta Yok</option>
                        <option value="expired">Miadı Doldu</option>
                    </select>
                    <select
                        name="expireMonths"
                        value={filters.expireMonths}
                        onChange={handleFilterChange}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                        <option value="">SKT Filtresi Yok</option>
                        <option value="1">1 Ay İçinde Bitecek</option>
                        <option value="3">3 Ay İçinde Bitecek</option>
                        <option value="6">6 Ay İçinde Bitecek</option>
                         <option value="12">12 Ay İçinde Bitecek</option>
                    </select>
                    <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700 underline text-right sm:text-left">
                        Filtreleri Temizle
                    </button>
                </div>
            )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                        <th className="p-4 w-10">
                            <div className="flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={selectedIds.length > 0 && selectedIds.length === paginatedData.length}
                                    disabled={paginatedData.length === 0}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                />
                            </div>
                        </th>
                        <th onClick={() => handleSort('productName')} className="p-4 cursor-pointer hover:bg-gray-100 transition-colors group">
                            <div className="flex items-center gap-2">
                                Ürün Adı {renderSortIcon('productName')}
                            </div>
                        </th>
                        <th className="p-4">
                            <div className="flex items-center gap-2">
                                Teklif Tipi
                            </div>
                        </th>
                        <th onClick={() => handleSort('stock')} className="p-4 cursor-pointer hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-2">
                                Stok {renderSortIcon('stock')}
                            </div>
                        </th>
                        <th className="p-4">
                            <div className="flex items-center gap-2">
                                Barem
                            </div>
                        </th>
                        <th onClick={() => handleSort('expirationDate')} className="p-4 cursor-pointer hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-2">
                                S.K.T. {renderSortIcon('expirationDate')}
                            </div>
                        </th>
                        <th onClick={() => handleSort('price')} className="p-4 text-right cursor-pointer hover:bg-gray-100 transition-colors">
                            <div className="flex items-center justify-end gap-2">
                                Birim Fiyat {renderSortIcon('price')}
                            </div>
                        </th>
                        <th className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                                Hedef
                            </div>
                        </th>
                        <th onClick={() => handleSort('status')} className="p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors">
                            <div className="flex items-center justify-center gap-2">
                                Durum {renderSortIcon('status')}
                            </div>
                        </th>
                        <th className="p-4 text-right">İşlemler</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {paginatedData.length === 0 ? (
                        <tr>
                            <td colSpan={10} className="p-12 text-center text-gray-500">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                        <Filter className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <p className="text-lg font-medium text-gray-900">Sonuç bulunamadı</p>
                                    <p className="text-sm">Arama kriterlerinizi değiştirerek tekrar deneyin.</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        paginatedData.map((item) => (
                            <tr 
                                key={item.id} 
                                className={`group hover:bg-blue-50/30 transition-colors ${selectedIds.includes(item.id) ? 'bg-blue-50/60' : ''}`}
                            >
                                <td className="p-4">
                                    <div className="flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(item.id)}
                                            onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        {/* 🆕 İlaç ismine tıklayınca ilaç detay sayfasına yönlendir */}
                                        <Link 
                                            href={`/ilaclar/${(item as any).medicationId || item.id}?type=${((item as any).type || 'stocksale').toLowerCase()}&offerId=${item.id}`}
                                            className="font-medium text-gray-900 hover:text-blue-600 hover:underline transition-colors cursor-pointer"
                                        >
                                            {item.productName}
                                        </Link>
                                        <span className="text-xs text-gray-500 font-mono mt-0.5">
                                            {item.barcode || '-'}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                        {translateOfferType((item as any).type)}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        {String(item.stock).split('+')[0].trim()}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                        {(item as any).malFazlasi || '0+0'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className="text-sm text-gray-700 font-medium">
                                        {item.expirationDate}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="font-bold text-gray-900">
                                        <PriceDisplay amount={item.price} />
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    {(item as any).isPrivate ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700">
                                            <Lock className="w-3 h-3" />
                                            Özel
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700">
                                            <Globe className="w-3 h-3" />
                                            Herkese Açık
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-center">
                                    <StatusBadge status={item.status} type="offer" />
                                </td>
                                <td className="p-4 text-right">
                                    <button
                                        ref={(el) => {
                                            if (el) buttonRefs.current.set(item.id, el);
                                        }}
                                        data-menu-button
                                        onClick={(e) => toggleMenu(item.id, e.currentTarget)}
                                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="İşlemler"
                                        disabled={isProcessing}
                                    >
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {/* Footer & Pagination */}
        {totalPages > 1 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                    Toplam {filteredAndSortedData.length} kayıttan {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedData.length)} arası gösteriliyor
                </span>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => handlePageChange(currentPage - 1)} 
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Önceki
                    </button>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            // Simple pagination logic for display
                            let pageNum = i + 1;
                            if (totalPages > 5 && currentPage > 3) {
                                pageNum = currentPage - 2 + i;
                                if (pageNum > totalPages) pageNum = i + 1; // Fallback
                            }
                            
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => handlePageChange(pageNum)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>
                    <button 
                        onClick={() => handlePageChange(currentPage + 1)} 
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Sonraki
                    </button>
                </div>
            </div>
        )}
    </div>

    {/* Dropdown Menu - Rendered outside table with position: fixed */}
    {activeMenuId !== null && menuPosition && (() => {
      const activeItem = paginatedData.find(item => item.id === activeMenuId);
      if (!activeItem) return null;
      return (
        <div 
          ref={menuRef}
          className="fixed w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-[9999] py-1"
          style={{
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
          }}
        >
          <Link 
            href={`/tekliflerim/${activeItem.id}`}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => { setActiveMenuId(null); setMenuPosition(null); }}
          >
            <Edit2 className="w-4 h-4 text-blue-500" />
            <span>Düzenle</span>
          </Link>
          
          {activeItem.status !== 'expired' && activeItem.status !== 'out_of_stock' && (
            <button
              onClick={() => handleToggleStatus(activeItem.id, activeItem.status)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
              disabled={isProcessing}
            >
              {activeItem.status === 'active' ? (
                <>
                  <PauseCircle className="w-4 h-4 text-amber-500" />
                  <span>Pasife Al</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 text-emerald-500" />
                  <span>Aktif Et</span>
                </>
              )}
            </button>
          )}
          
          <div className="h-px bg-gray-200 my-1" />
          
          <button
            onClick={() => openDeleteConfirmation(activeItem.id, activeItem.productName)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
            disabled={isProcessing}
          >
            <Trash2 className="w-4 h-4" />
            <span>Sil</span>
          </button>
        </div>
      );
    })()}

    {/* Delete Confirmation Modal */}
    {deleteConfirmation && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Teklifi Sil</h3>
              <p className="text-sm text-gray-500">Bu işlem geri alınamaz</p>
            </div>
          </div>
          
          <p className="text-gray-700 mb-6">
            <span className="font-medium">{deleteConfirmation.name}</span> ürününü tekliflerden kalıcı olarak silmek istediğinizden <span className="text-red-600 font-semibold">emin misiniz?</span>
          </p>
          
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setDeleteConfirmation(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isProcessing}
            >
              İptal
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Siliniyor...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Evet, Sil
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Toast Notification */}
    {toastMessage && (
      <Toast
        message={toastMessage.text}
        type={toastMessage.type}
        onClose={() => setToastMessage(null)}
      />
    )}
  </>
  );
};

export default OffersTable;