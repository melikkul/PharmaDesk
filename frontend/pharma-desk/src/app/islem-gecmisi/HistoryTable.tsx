// src/app/islem-gecmisi/HistoryTable.tsx
'use client';

import React, { useState, useMemo } from 'react';
// Tipler ve Bileşenler
import { TransactionHistoryItem, TransactionStatus, TransactionType } from '@/data/dashboardData';
import DashboardCard from '@/components/DashboardCard';
import tableStyles from '@/components/dashboard/Table.module.css';
// Stil dosyalarını TEKLİFLERİM sayfasından ortak kullanıyoruz (Filtre, Badge, Pagination stilleri için)
import filterStyles from '@/app/tekliflerim/InventoryFilter.module.css';
import pageStyles from './islem-gecmisi.module.css'; // Sayfa özel stilleri

// İkonlar
const FilterIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>;
const ViewIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const DownloadIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const SortAscIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6l-6 6h12l-6-6z"/></svg>;
const SortDescIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18l-6-6h12l-6 6z"/></svg>;
const SortIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6l-4 4h8l-4-4zm0 12l-4-4h8l-4 4z"/></svg>;

// Yardımcı Fonksiyonlar
const parseDate = (dateStr: string): Date => new Date(dateStr);

const formatDate = (dateStr: string): string => {
  return parseDate(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getStatusBadge = (status: TransactionStatus) => {
  switch (status) {
    case 'Tamamlandı': return <span className={`${filterStyles.badge} ${filterStyles.badgeSuccess}`}>Tamamlandı</span>;
    case 'İşlemde': return <span className={`${filterStyles.badge} ${filterStyles.badgeWarning}`}>İşlemde</span>;
    case 'İptal Edildi': return <span className={`${filterStyles.badge} ${filterStyles.badgeDanger}`}>İptal Edildi</span>;
    default: return <span className={filterStyles.badge}>Bilinmiyor</span>;
  }
};

const getTransactionTypeBadge = (type: TransactionType) => {
    switch (type) {
        case 'Alış': return <span style={{color: 'var(--negative-color)', fontWeight: 500}}>Alış</span>;
        case 'Satış': return <span style={{color: 'var(--positive-color)', fontWeight: 500}}>Satış</span>;
        case 'İade': return <span style={{color: '#f39c12', fontWeight: 500}}>İade</span>;
        case 'Bakiye Yükleme': return <span style={{color: 'var(--sidebar-bg)', fontWeight: 500}}>Bakiye Yükleme</span>;
        default: return <span>{type}</span>;
    }
};

// Sıralama ve Filtreleme Tipleri
type SortField = keyof TransactionHistoryItem | null;
type SortDirection = 'asc' | 'desc';
interface FilterState {
  searchTerm: string;
  transactionType: TransactionType | '';
  status: TransactionStatus | '';
  dateStart: string;
  dateEnd: string;
}

interface HistoryTableProps {
  data: TransactionHistoryItem[];
}

const ITEMS_PER_PAGE = 10;

const HistoryTable: React.FC<HistoryTableProps> = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(true);

  // Sıralama State
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Filtreleme State
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    transactionType: '',
    status: '',
    dateStart: '',
    dateEnd: '',
  });

  // Filtreleme ve Sıralama Mantığı
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data];
    const lowerSearchTerm = filters.searchTerm.toLowerCase();

    // Filtreler
    filtered = filtered.filter(item => {
      // Arama Filtresi (ID, Ürün Adı, Karşı Taraf)
      if (filters.searchTerm &&
          !item.id.toLowerCase().includes(lowerSearchTerm) &&
          !item.productName?.toLowerCase().includes(lowerSearchTerm) &&
          !item.counterparty?.toLowerCase().includes(lowerSearchTerm)
      ) {
        return false;
      }
      // İşlem Tipi Filtresi
      if (filters.transactionType && item.type !== filters.transactionType) {
        return false;
      }
      // Durum Filtresi
      if (filters.status && item.status !== filters.status) {
        return false;
      }
      // Tarih Filtresi
      const itemDate = parseDate(item.date);
      if (filters.dateStart && itemDate < parseDate(filters.dateStart)) {
        return false;
      }
      if (filters.dateEnd && itemDate > parseDate(filters.dateEnd)) {
        return false;
      }
      return true;
    });

    // Sıralama
    if (sortField) {
      filtered.sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'date') {
          valA = parseDate(valA as string);
          valB = parseDate(valB as string);
        } else if (sortField === 'amount') {
          valA = Number(valA);
          valB = Number(valB);
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Sıralama İkonu ve Fonksiyonu
  const renderSortIcon = (field: keyof TransactionHistoryItem) => {
    if (sortField !== field) return <SortIcon />;
    return sortDirection === 'asc' ? <SortAscIcon /> : <SortDescIcon />;
  };

  const handleSort = (field: keyof TransactionHistoryItem) => {
    setSortField(prevField => {
      if (prevField === field) {
        setSortDirection(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
        return field;
      } else {
        setSortDirection('desc'); // Tarih gibi alanlar için varsayılan 'desc'
        return field;
      }
    });
    setCurrentPage(1);
  };

  // Filtre Değişikliği
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ searchTerm: '', transactionType: '', status: '', dateStart: '', dateEnd: '' });
    setCurrentPage(1);
  };

  return (
    <DashboardCard title="Tüm İşlemler">
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
        </div>
        {showFilters && (
          <div className={filterStyles.filterControls} style={{ gridTemplateColumns: '1.5fr repeat(4, 1fr) auto', gap: '10px' }}>
            <input
              type="text"
              name="searchTerm"
              placeholder="İşlem No, Ürün Adı, Karşı Taraf Ara..."
              value={filters.searchTerm}
              onChange={handleFilterChange}
              className={filterStyles.filterInput}
            />
            <select
              name="transactionType"
              value={filters.transactionType}
              onChange={handleFilterChange}
              className={filterStyles.filterSelect}
            >
              <option value="">Tüm Tipler</option>
              <option value="Alış">Alış</option>
              <option value="Satış">Satış</option>
              <option value="İade">İade</option>
              <option value="Bakiye Yükleme">Bakiye Yükleme</option>
            </select>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className={filterStyles.filterSelect}
            >
              <option value="">Tüm Durumlar</option>
              <option value="Tamamlandı">Tamamlandı</option>
              <option value="İşlemde">İşlemde</option>
              <option value="İptal Edildi">İptal Edildi</option>
            </select>
            
            <input
              type="date"
              name="dateStart"
              value={filters.dateStart}
              onChange={handleFilterChange}
              className={filterStyles.filterInput}
            />
             <input
              type="date"
              name="dateEnd"
              value={filters.dateEnd}
              onChange={handleFilterChange}
              className={filterStyles.filterInput}
            />
            
            <button onClick={clearFilters} className={filterStyles.clearButton}>Temizle</button>
          </div>
        )}
      </div>

      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th onClick={() => handleSort('date')} className={tableStyles.sortableHeader}>
              Tarih {renderSortIcon('date')}
            </th>
            <th onClick={() => handleSort('id')} className={tableStyles.sortableHeader}>
              İşlem No {renderSortIcon('id')}
            </th>
            <th onClick={() => handleSort('type')} className={tableStyles.sortableHeader}>
              İşlem Tipi {renderSortIcon('type')}
            </th>
            <th>İlgili Ürün</th>
            <th>Karşı Taraf</th>
            <th onClick={() => handleSort('status')} className={tableStyles.sortableHeader}>
              Durum {renderSortIcon('status')}
            </th>
            <th onClick={() => handleSort('amount')} className={`${tableStyles.sortableHeader} ${tableStyles.textRight}`}>
              Tutar {renderSortIcon('amount')}
            </th>
            <th>Eylemler</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>Filtrelere uygun işlem bulunamadı.</td></tr>
          )}
          {paginatedData.map(item => (
            <tr key={item.id}>
              <td>{formatDate(item.date)}</td>
              <td>{item.id}</td>
              <td>{getTransactionTypeBadge(item.type)}</td>
              <td>{item.productName || '-'}</td>
              <td>{item.counterparty || '-'}</td>
              <td>{getStatusBadge(item.status)}</td>
              <td className={`${tableStyles.textRight} ${tableStyles.fontBold}`} style={{color: item.amount > 0 ? 'var(--positive-color)' : 'var(--negative-color)'}}>
                {item.amount > 0 ? '+' : ''}{item.amount.toFixed(2)} ₺
              </td>
              <td className={pageStyles.actionCell}>
                <button className={`${pageStyles.actionButton} ${pageStyles.viewButton}`} title="Detayları Görüntüle">
                  <ViewIcon />
                </button>
                 {item.status === 'Tamamlandı' && (item.type === 'Alış' || item.type === 'Satış') && (
                    <button className={`${pageStyles.actionButton} ${pageStyles.downloadButton}`} title="Faturayı İndir">
                        <DownloadIcon />
                    </button>
                 )}
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

export default HistoryTable;