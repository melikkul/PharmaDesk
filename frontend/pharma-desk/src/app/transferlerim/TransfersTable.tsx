// src/app/transferlerim/TransfersTable.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { ShipmentItem, ShipmentStatus, TransferType } from '@/data/dashboardData';
import DashboardCard from '@/components/DashboardCard';
import tableStyles from '@/components/dashboard/Table.module.css';
import filterStyles from '@/app/tekliflerim/InventoryFilter.module.css';
import pageStyles from './transferlerim.module.css';

// İkonlar
const FilterIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>;
const TrackingIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const SortAscIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6l-6 6h12l-6-6z"/></svg>;
const SortDescIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18l-6-6h12l-6 6z"/></svg>;
const SortIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6l-4 4h8l-4-4zm0 12l-4-4h8l-4 4z"/></svg>;


// Yardımcı Fonksiyonlar
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

// Kargo Takip Linki (Örnek)
const getTrackingUrl = (provider: string, trackingNumber: string) => {
    if (provider.toLowerCase().includes('yurtiçi')) {
        return `https://www.yurticikargo.com/tr/cargo-tracking?code=${trackingNumber}`;
    }
    // Diğer kargo firmaları için linkler eklenebilir
    return `https://www.google.com/search?q=${provider}+${trackingNumber}+kargo+takip`;
};

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

  const handlePageChange = (page: number) => setCurrentPage(page);
  const handleSort = (field: keyof ShipmentItem) => {
    setSortField(prevField => {
      if (prevField === field) {
        setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
        return field;
      }
      setSortDirection('desc');
      return field;
    });
    setCurrentPage(1);
  };
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };
  const clearFilters = () => {
    setFilters({ searchTerm: '', transferType: '', status: '', dateStart: '', dateEnd: '' });
    setCurrentPage(1);
  };
  const renderSortIcon = (field: keyof ShipmentItem) => {
    if (sortField !== field) return <SortIcon />;
    return sortDirection === 'asc' ? <SortAscIcon /> : <SortDescIcon />;
  };

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
          <div className={filterStyles.filterControls} style={{ gridTemplateColumns: '1.5fr repeat(4, 1fr) auto', gap: '10px' }}>
            <input
              type="text" name="searchTerm" placeholder="Sipariş No, Kargo No, Ürün Adı..."
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
            <input type="date" name="dateEnd" value={filters.dateEnd} onChange={handleFilterChange} className={filterStyles.filterInput} />
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
            <th onClick={() => handleSort('shippingProvider')} className={tableStyles.sortableHeader}>Kargo Firması {renderSortIcon('shippingProvider')}</th>
            <th onClick={() => handleSort('trackingNumber')} className={tableStyles.sortableHeader}>Kargo No {renderSortIcon('trackingNumber')}</th>
            <th onClick={() => handleSort('status')} className={tableStyles.sortableHeader}>Durum {renderSortIcon('status')}</th>
            <th>Takip</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.length === 0 && (
            <tr><td colSpan={9} style={{ textAlign: 'center', padding: '20px' }}>Filtrelere uygun transfer bulunamadı.</td></tr>
          )}
          {paginatedData.map(item => (
            <tr key={item.id}>
              <td>{formatDate(item.date)}</td>
              <td>{getTransferType(item.transferType)}</td>
              <td>{item.orderNumber}</td>
              <td>{item.counterparty}</td>
              <td>{item.productName}</td>
              <td>{item.shippingProvider}</td>
              <td>{item.trackingNumber}</td>
              <td>{getStatusBadge(item.status)}</td>
              <td className={pageStyles.actionCell}>
                <a 
                  href={getTrackingUrl(item.shippingProvider, item.trackingNumber)} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`${pageStyles.actionButton} ${pageStyles.trackButton}`}
                  title="Kargo Takip"
                >
                  <TrackingIcon />
                </a>
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