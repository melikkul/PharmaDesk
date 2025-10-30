// src/app/(dashboard)/transferlerim/TransfersTable.tsx
'use client';

// ### OPTİMİZASYON: 'useCallback' import edildi ###
import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ShipmentItem, ShipmentStatus, TransferType } from '@/data/dashboardData';
import DashboardCard from '@/components/DashboardCard';
import tableStyles from '@/components/dashboard/Table.module.css';
// === DÜZELTME BURADA ===
// Hatalı yol: import filterStyles from '@/app/tekliflerim/InventoryFilter.module.css';
import filterStyles from '@/app/(dashboard)/tekliflerim/InventoryFilter.module.css'; // Yeni doğru yol
// =======================
import pageStyles from './transferlerim.module.css';

// İkonlar
const FilterIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>;
const TruckIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>;
const SortAscIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6l-6 6h12l-6-6z"/></svg>;
const SortDescIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18l-6-6h12l-6 6z"/></svg>;
const SortIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6l-4 4h8l-4-4zm0 12l-4-4h8l-4 4z"/></svg>;


// ### OPTİMİZASYON: Yardımcı Fonksiyonlar Component Dışına Taşındı ###
const parseDate = (dateStr: string): Date => new Date(dateStr);
const formatDate = (dateStr: string): string => {
  return parseDate(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// Kargo Durumuna göre stil
const getStatusBadge = (status: ShipmentStatus) => {
  switch (status) {
    case 'delivered': return <span className={`${filterStyles.badge} ${filterStyles.badgeSuccess}`}>Teslim Edildi</span>;
    case 'in_transit': return <span className={`${filterStyles.badge} ${pageStyles.badgeInfo}`}>Dağıtımda</span>;
    case 'shipped': return <span className={`${filterStyles.badge} ${filterStyles.badgeWarning}`}>Kargoya Verildi</span>;
    case 'pending': return <span className={`${filterStyles.badge} ${filterStyles.badgeSecondary}`}>Bekleniyor</span>;
    case 'cancelled': return <span className={`${filterStyles.badge} ${filterStyles.badgeDanger}`}>İptal Edildi</span>;
    default: return <span className={filterStyles.badge}>Bilinmiyor</span>;
  }
};

// Transfer Yönü (Alış/Satış)
const getTransferType = (type: TransferType) => {
    return type === 'inbound' ? 
        <span style={{color: 'var(--positive-color)', fontWeight: 600}}>Alış</span> : 
        <span style={{color: 'var(--negative-color)', fontWeight: 600}}>Satış</span>;
};
// ### Optimizasyon Sonu: Yardımcı Fonksiyonlar ###


// Tipler
type SortField = keyof ShipmentItem | null;
type SortDirection = 'asc' | 'desc';
interface FilterState {
  searchTerm: string;
  transferType: TransferType | '';
  status: ShipmentStatus | '';
  dateStart: string;
  dateEnd: string;
}

interface TransfersTableProps {
  data: ShipmentItem[];
}

const ITEMS_PER_PAGE = 10;

const TransfersTable: React.FC<TransfersTableProps> = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    transferType: '',
    status: '',
    dateStart: '',
    dateEnd: '',
  });

  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data];
    const lowerSearchTerm = filters.searchTerm.toLowerCase();

    filtered = filtered.filter(item => {
      if (filters.searchTerm &&
          !item.orderNumber.toLowerCase().includes(lowerSearchTerm) &&
          !item.productName.toLowerCase().includes(lowerSearchTerm) &&
          !item.counterparty.toLowerCase().includes(lowerSearchTerm) &&
          !item.trackingNumber.includes(lowerSearchTerm)
      ) return false;
      if (filters.transferType && item.transferType !== filters.transferType) return false;
      if (filters.status && item.status !== filters.status) return false;
      const itemDate = parseDate(item.date);
      if (filters.dateStart && itemDate < parseDate(filters.dateStart)) return false;
      if (filters.dateEnd && itemDate > parseDate(filters.dateEnd)) return false;
      return true;
    });

    if (sortField) {
      filtered.sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        if (sortField === 'date') {
          valA = parseDate(valA as string);
          valB = parseDate(valB as string);
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

  const totalPages = Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedData, currentPage]);

  // ### OPTİMİZASYON: useCallback ###
  const handlePageChange = useCallback((page: number) => setCurrentPage(page), []);

  // ### OPTİMİZASYON: useCallback ###
  const handleSort = useCallback((field: keyof ShipmentItem) => {
    setSortField(prevField => {
      if (prevField === field) {
        setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
        return field;
      }
      setSortDirection('desc');
      return field;
    });
    setCurrentPage(1);
  }, []); // Bağımlılığı yok

  // ### OPTİMİZASYON: useCallback ###
  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  }, []); // Bağımlılığı yok

  // ### OPTİMİZASYON: useCallback ###
  const clearFilters = useCallback(() => {
    setFilters({ searchTerm: '', transferType: '', status: '', dateStart: '', dateEnd: '' });
    setCurrentPage(1);
  }, []); // Bağımlılığı yok

  // ### OPTİMİZASYON: useCallback ###
  const renderSortIcon = useCallback((field: keyof ShipmentItem) => {
    if (sortField !== field) return <SortIcon />;
    return sortDirection === 'asc' ? <SortAscIcon /> : <SortDescIcon />;
  }, [sortField, sortDirection]); // 'sortField' ve 'sortDirection' state'lerine bağımlı

  return (
    <DashboardCard title="Tüm Transferler">
      {/* Filtreleme Alanı */}
      <div className={filterStyles.filterContainer}>
        <div className={filterStyles.filterHeader}>
          <button onClick={() => setShowFilters(!showFilters)} className={filterStyles.filterToggleButton}>
            <FilterIcon /> <span>{showFilters ? 'Filtreleri Gizle' : 'Filtreleri Göster'}</span>
          </button>
        </div>
        {showFilters && (
          // ISTEK 6: gridTemplateColumns 1.5fr repeat(4, 1fr) auto -> 1.5fr repeat(3, 1fr) auto
          <div className={filterStyles.filterControls} style={{ gridTemplateColumns: '1.5fr repeat(3, 1fr) auto', gap: '10px' }}>
            <input
              type="text" name="searchTerm" placeholder="Sipariş No, Takip No, Ürün Adı..."
              value={filters.searchTerm} onChange={handleFilterChange} className={filterStyles.filterInput}
            />
            <select name="transferType" value={filters.transferType} onChange={handleFilterChange} className={filterStyles.filterSelect}>
              <option value="">Tüm Yönler</option>
              <option value="inbound">Gelen (Alış)</option>
              <option value="outbound">Giden (Satış)</option>
            </select>
            <select name="status" value={filters.status} onChange={handleFilterChange} className={filterStyles.filterSelect}>
              <option value="">Tüm Durumlar</option>
              <option value="pending">Bekleniyor</option>
              <option value="shipped">Kargoya Verildi</option>
              <option value="in_transit">Dağıtımda</option>
              <option value="delivered">Teslim Edildi</option>
              <option value="cancelled">İptal Edildi</option>
            </select>
            <input type="date" name="dateStart" value={filters.dateStart} onChange={handleFilterChange} className={filterStyles.filterInput} />
            {/* ISTEK 6: Bir tarih filtresi kaldırıldı (veya diğeri eklenebilir, şimdilik biri kaldı) */}
            {/* <input type="date" name="dateEnd" value={filters.dateEnd} onChange={handleFilterChange} className={filterStyles.filterInput} /> */}
            <button onClick={clearFilters} className={filterStyles.clearButton}>Temizle</button>
          </div>
        )}
      </div>

      {/* Tablo */}
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th onClick={() => handleSort('date')} className={tableStyles.sortableHeader}>Tarih {renderSortIcon('date')}</th>
            <th onClick={() => handleSort('transferType')} className={tableStyles.sortableHeader}>Yön {renderSortIcon('transferType')}</th>
            <th onClick={() => handleSort('orderNumber')} className={tableStyles.sortableHeader}>Sipariş No {renderSortIcon('orderNumber')}</th>
            <th onClick={() => handleSort('counterparty')} className={tableStyles.sortableHeader}>Karşı Taraf {renderSortIcon('counterparty')}</th>
            <th onClick={() => handleSort('productName')} className={tableStyles.sortableHeader}>Ürün {renderSortIcon('productName')}</th>
            {/* ISTEK 6: Kargo Firması kaldırıldı */}
            {/* <th onClick={() => handleSort('shippingProvider')} className={tableStyles.sortableHeader}>Kargo Firması {renderSortIcon('shippingProvider')}</th> */}
            <th onClick={() => handleSort('trackingNumber')} className={tableStyles.sortableHeader}>Takip No {renderSortIcon('trackingNumber')}</th>
            <th onClick={() => handleSort('status')} className={tableStyles.sortableHeader}>Durum {renderSortIcon('status')}</th>
            <th>Detay</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>Filtrelere uygun transfer bulunamadı.</td></tr>
          )}
          {paginatedData.map(item => (
            <tr key={item.id}>
              <td>{formatDate(item.date)}</td>
              <td>{getTransferType(item.transferType)}</td>
              <td>{item.orderNumber}</td>
              <td>{item.counterparty}</td>
              <td>{item.productName}</td>
              {/* ISTEK 6: Kargo Firması kaldırıldı */}
              {/* <td>{item.shippingProvider}</td> */}
              <td>{item.trackingNumber}</td>
              <td>{getStatusBadge(item.status)}</td>
              <td className={pageStyles.actionCell}>
                {/* ISTEK 6: Link ve ikon güncellendi */}
                <Link 
                  href={`/transferlerim/${item.id}`} // İç sayfaya yönlendir
                  className={`${pageStyles.actionButton} ${pageStyles.trackButton}`}
                  title="Kargo Detayı"
                >
                  <TruckIcon />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className={filterStyles.pagination}>
          <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>&lt; Önceki</button>
          <span>Sayfa {currentPage} / {totalPages}</span>
          <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Sonraki &gt;</button>
        </div>
      )}
    </DashboardCard>
  );
};

export default TransfersTable;