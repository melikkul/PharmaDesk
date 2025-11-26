// src/app/(dashboard)/tekliflerim/InventoryTable.tsx
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { MedicationItem, OfferStatus } from '@/lib/dashboardData';
import DashboardCard from '@/components/DashboardCard';
import { PriceDisplay, StatusBadge, DateDisplay } from '@/components/common';
import tableStyles from '@/components/dashboard/Table.module.css';
import pageStyles from './tekliflerim.module.css';
import filterStyles from './InventoryFilter.module.css'; 

// İkonlar
const EditIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const DeleteIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const PauseIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;
const PlayIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>;
const FilterIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>;
const SortAscIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6l-6 6h12l-6-6z"/></svg>;
const SortDescIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18l-6-6h12l-6 6z"/></svg>;
const SortIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6l-4 4h8l-4-4zm0 12l-4-4h8l-4 4z"/></svg>;


// ### YARDIMCI FONKSİYONLAR ###
// Date parsing helper for filtering and sorting
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 2) {
    const year = parseInt(`20${parts[1]}`, 10);
    const month = parseInt(parts[0], 10) - 1; 
    if (!isNaN(year) && !isNaN(month)) {
      return new Date(year, month, 1);
    }
  } else if (dateStr.includes('-')) {
    return new Date(dateStr);
  }
  return null;
};
// ### YARDIMCI FONKSİYONLAR SONU ###


// Tipler
type SortField = keyof MedicationItem | null;
type SortDirection = 'asc' | 'desc';
interface FilterState {
    searchTerm: string;
    status: OfferStatus | '';
    expireMonths: number | ''; 
}

interface OffersTableProps {
  data: MedicationItem[];
  onDeleteItems: (ids: number[]) => Promise<void>;
  onUpdateStatus: (ids: number[], status: OfferStatus) => Promise<void>;
}

const ITEMS_PER_PAGE = 10; 

const OffersTable: React.FC<OffersTableProps> = ({
    data,
    onDeleteItems,
    onUpdateStatus
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

  // Filtreleme ve Sıralama Mantığı
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data];

    if (filters.searchTerm) {
        const lowerSearchTerm = filters.searchTerm.toLowerCase();
        filtered = filtered.filter(item =>
            item.productName.toLowerCase().includes(lowerSearchTerm) ||
            item.barcode?.includes(lowerSearchTerm)
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

    // Sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        if (sortField === 'expirationDate' || sortField === 'dateAdded') {
          valA = parseDate(valA as string);
          valB = parseDate(valB as string);
          if (!valA) return 1;
          if (!valB) return -1;
        } else if (sortField === 'price' || sortField === 'stock') {
             if (sortField === 'stock') {
                 valA = parseInt((valA as string).split(' + ')[0], 10) || 0;
                 valB = parseInt((valB as string).split(' + ')[0], 10) || 0;
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

  // Sayfalama Mantığı
  const totalPages = Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedData, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    setSelectedIds([]); 
  }, []);

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

  const renderSortIcon = useCallback((field: keyof MedicationItem) => {
    if (sortField !== field) return <SortIcon />;
    return sortDirection === 'asc' ? <SortAscIcon /> : <SortDescIcon />;
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

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  }, []); 

  const clearFilters = useCallback(() => {
    setFilters({ searchTerm: '', status: '', expireMonths: '' });
    setCurrentPage(1);
  }, []); 

  // --- Toplu İşlem Fonksiyonları ---
  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`${selectedIds.length} adet teklifi kalıcı olarak silmek istediğinizden emin misiniz?`)) {
        setIsProcessing(true);
        try {
            await onDeleteItems(selectedIds); 
            setSelectedIds([]); 
        } catch (error) {
            console.error("Toplu silme başarısız:", error);
        } finally {
            setIsProcessing(false);
        }
    }
  }, [selectedIds, onDeleteItems]);

  const handleBatchUpdateStatus = useCallback(async (status: OfferStatus) => {
      if (selectedIds.length === 0) return;
      const statusText = status === 'active' ? 'aktif' : 'pasif';
      if (window.confirm(`${selectedIds.length} adet teklifin durumunu "${statusText}" olarak güncellemek istediğinizden emin misiniz?`)) {
        setIsProcessing(true);
        try {
            await onUpdateStatus(selectedIds, status); 
            setSelectedIds([]); 
        } catch (error) {
            console.error("Toplu durum güncelleme başarısız:", error);
        } finally {
            setIsProcessing(false);
        }
    }
  }, [selectedIds, onUpdateStatus]);

  // --- Tekil İşlem Fonksiyonları ---
  const handleDelete = useCallback(async (id: number, name: string) => {
    if (window.confirm(`${name} ürününü tekliflerden kalıcı olarak silmek istediğinizden emin misiniz?`)) {
        setIsProcessing(true);
        try {
             await onDeleteItems([id]);
             setSelectedIds(prev => prev.filter(itemId => itemId !== id));
        } catch (error) { console.error("Silme başarısız:", error); }
        finally { setIsProcessing(false); }
    }
  }, [onDeleteItems]);

  const handleToggleStatus = useCallback(async (id: number, currentStatus: OfferStatus) => {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      setIsProcessing(true);
      try {
           await onUpdateStatus([id], newStatus);
      } catch (error) { console.error("Durum güncelleme başarısız:", error); }
      finally { setIsProcessing(false); }
  }, [onUpdateStatus]);


  return (
    <DashboardCard title="Yayındaki Tekliflerim">
        {/* Filtreleme Alanı */}
        <div className={filterStyles.filterContainer}>
            <div className={filterStyles.filterHeader}>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={filterStyles.filterToggleButton}
                >
                    <FilterIcon />
                    <span>{showFilters ? 'Filtreleri Gizle' : 'Filtreleri Göster'}</span>
                </button>
                 {/* Toplu İşlem Butonları */}
                {selectedIds.length > 0 && (
                    <div className={filterStyles.batchActions}>
                        <span>{selectedIds.length} öğe seçildi:</span>
                        <button onClick={() => handleBatchUpdateStatus('active')} disabled={isProcessing} className={filterStyles.batchButton}>
                            <PlayIcon /> Aktif Et
                        </button>
                        <button onClick={() => handleBatchUpdateStatus('paused')} disabled={isProcessing} className={filterStyles.batchButton}>
                            <PauseIcon /> Pasif Et
                        </button>
                        <button onClick={handleBatchDelete} disabled={isProcessing} className={`${filterStyles.batchButton} ${filterStyles.batchButtonDanger}`}>
                            <DeleteIcon /> Sil
                        </button>
                    </div>
                )}
            </div>
            {showFilters && (
                <div className={filterStyles.filterControls}>
                    <input
                        type="text"
                        name="searchTerm"
                        placeholder="İlaç adı veya barkod ara..."
                        value={filters.searchTerm}
                        onChange={handleFilterChange}
                        className={filterStyles.filterInput}
                    />
                    <select
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                        className={filterStyles.filterSelect}
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
                        className={filterStyles.filterSelect}
                    >
                        <option value="">SKT Filtresi Yok</option>
                        <option value="1">1 Ay İçinde Bitecek</option>
                        <option value="3">3 Ay İçinde Bitecek</option>
                        <option value="6">6 Ay İçinde Bitecek</option>
                         <option value="12">12 Ay İçinde Bitecek</option>
                    </select>
                    <button onClick={clearFilters} className={filterStyles.clearButton}>Temizle</button>
                </div>
            )}
        </div>


      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th style={{ width: '40px' }}>
              <input
                type="checkbox"
                onChange={handleSelectAll}
                checked={selectedIds.length > 0 && selectedIds.length === paginatedData.length}
                disabled={paginatedData.length === 0}
              />
            </th>
            <th onClick={() => handleSort('productName')} className={tableStyles.sortableHeader}>
                Ürün Adı {renderSortIcon('productName')}
            </th>
            <th onClick={() => handleSort('barcode')} className={tableStyles.sortableHeader}>
                Barkod {renderSortIcon('barcode')}
            </th>
            <th onClick={() => handleSort('stock')} className={tableStyles.sortableHeader}>
                Stok (Adet+MF) {renderSortIcon('stock')}
            </th>
            <th onClick={() => handleSort('expirationDate')} className={tableStyles.sortableHeader}>
                S.K.T. {renderSortIcon('expirationDate')}
            </th>
            <th onClick={() => handleSort('price')} className={`${tableStyles.sortableHeader} ${tableStyles.textRight}`}>
                Birim Fiyat {renderSortIcon('price')}
            </th>
            <th onClick={() => handleSort('dateAdded')} className={tableStyles.sortableHeader}>
                Ekl. Tarihi {renderSortIcon('dateAdded')}
            </th>
            <th onClick={() => handleSort('status')} className={tableStyles.sortableHeader}>
                Durum {renderSortIcon('status')}
            </th>
            <th>Eylemler</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.length === 0 && (
             <tr><td colSpan={9} style={{ textAlign: 'center', padding: '20px' }}>Filtrelere uygun teklif bulunamadı.</td></tr>
          )}
          {paginatedData.map(item => (
            <tr key={item.id} className={selectedIds.includes(item.id) ? tableStyles.selectedRow : ''}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                />
              </td>
              <td>{item.productName}</td>
              <td>{item.barcode || '-'}</td>
              <td>{item.stock}</td>
              <td>{item.expirationDate}</td>
              <td className={`${tableStyles.textRight} ${tableStyles.fontBold}`}>
                <PriceDisplay amount={item.price} />
              </td>
              <td>
                <DateDisplay date={item.dateAdded} format="date" />
              </td>
              <td>
                <StatusBadge status={item.status} type="offer" />
              </td>
              <td className={pageStyles.actionCell}>
                <Link href={`/tekliflerim/${item.id}`} passHref>
                  <button className={`${pageStyles.actionButton} ${pageStyles.editButton}`} title="Düzenle" disabled={isProcessing}>
                    <EditIcon />
                  </button>
                </Link>
                <button
                    onClick={() => handleToggleStatus(item.id, item.status)}
                    className={pageStyles.actionButton}
                    title={item.status === 'active' ? "Pasife Al" : "Aktif Et"}
                    disabled={isProcessing || item.status === 'expired' || item.status === 'out_of_stock'} 
                >
                    {item.status === 'active' ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.productName)}
                  className={`${pageStyles.actionButton} ${pageStyles.deleteButton}`}
                  title="Sil"
                  disabled={isProcessing}
                >
                  <DeleteIcon />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

       {/* Sayfalama Kontrolleri */}
      {totalPages > 1 && (
        <div className={filterStyles.pagination}>
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                &lt; Önceki
            </button>
            <span>Sayfa {currentPage} / {totalPages}</span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                Sonraki &gt;
            </button>
        </div>
       )}
    </DashboardCard>
  );
};

export default OffersTable;