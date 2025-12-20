// src/components/features/transactions/TransactionHistory.tsx
'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
// Tipler ve Bileşenler
import { TransactionHistoryItem, TransactionStatus, TransactionType } from '@/lib/dashboardData';
import DashboardCard from '@/components/DashboardCard';
import tableStyles from '@/components/dashboard/Table.module.css';
import filterStyles from '@/app/(dashboard)/tekliflerim/InventoryFilter.module.css';
import pageStyles from '@/app/(dashboard)/islem-gecmisi/islem-gecmisi.module.css';

// İkonlar
const FilterIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>;
const ViewIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
const SortAscIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6l-6 6h12l-6-6z"/></svg>;
const SortDescIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18l-6-6h12l-6 6z"/></svg>;
const SortIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6l-4 4h8l-4-4zm0 12l-4-4h8l-4 4z"/></svg>;
const MoreIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>;
const InvoiceIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const AlertIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const RepeatIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>;

// ### GÜVENLİ TARİH FORMATLAMA ###
// Backend "dd.MM.yyyy HH:mm" formatında tarih döndürüyor
const parseDate = (dateStr: string): Date => {
  // Backend formatı: "17.12.2025 14:30"
  if (dateStr && dateStr.includes('.')) {
    const parts = dateStr.split(' ');
    const dateParts = parts[0].split('.');
    const timeParts = parts[1]?.split(':') || ['00', '00'];
    
    if (dateParts.length === 3) {
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // JavaScript months are 0-indexed
      const year = parseInt(dateParts[2], 10);
      const hour = parseInt(timeParts[0], 10) || 0;
      const minute = parseInt(timeParts[1], 10) || 0;
      
      return new Date(year, month, day, hour, minute);
    }
  }
  // Fallback: try ISO format
  return new Date(dateStr);
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  
  // Eğer zaten formatlanmış geliyorsa (backend'den dd.MM.yyyy HH:mm)
  // doğrudan Türkçe'ye çevir
  if (dateStr.includes('.') && dateStr.includes(' ')) {
    try {
      const date = parseDate(dateStr);
      if (isNaN(date.getTime())) return dateStr; // Fallback to original
      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr; // Fallback to original format
    }
  }
  
  // ISO format fallback
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Tarih Hatası';
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return 'Tarih Hatası';
  }
};

// ### DURUM BADGE'LERİ ###
const getStatusBadge = (status: TransactionStatus) => {
  switch (status) {
    case 'Tamamlandı': return <span className={`${filterStyles.badge} ${filterStyles.badgeSuccess}`}>Tamamlandı</span>;
    case 'İşlemde': return <span className={`${filterStyles.badge} ${filterStyles.badgeWarning}`}>İşlemde</span>;
    case 'İptal Edildi': return <span className={`${filterStyles.badge} ${filterStyles.badgeDanger}`}>İptal Edildi</span>;
    default: return <span className={filterStyles.badge}>Bilinmiyor</span>;
  }
};

// ### İŞLEM TİPİ BADGE'LERİ (RENKLİ) ###
const getTransactionTypeBadge = (type: TransactionType) => {
    switch (type) {
        case 'Alış': return <span className={`${filterStyles.badge} ${filterStyles.badgeDanger}`}>Alış</span>;
        case 'Satış': return <span className={`${filterStyles.badge} ${filterStyles.badgeSuccess}`}>Satış</span>;
        case 'İade': return <span className={`${filterStyles.badge} ${filterStyles.badgeWarning}`}>İade</span>;
        case 'Bakiye Yükleme': return <span className={`${filterStyles.badge} ${filterStyles.badgeInfo}`}>Bakiye Yükleme</span>;
        default: return <span className={filterStyles.badge}>{type}</span>;
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
  const router = useRouter();
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

  // ### OPTİMİZASYON: useCallback ###
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []); // Bağımlılığı yok

  // ### OPTİMİZASYON: useCallback ###
  // Sıralama İkonu ve Fonksiyonu
  const renderSortIcon = useCallback((field: keyof TransactionHistoryItem) => {
    if (sortField !== field) return <SortIcon />;
    return sortDirection === 'asc' ? <SortAscIcon /> : <SortDescIcon />;
  }, [sortField, sortDirection]); // 'sortField' ve 'sortDirection' state'lerine bağımlı

  // ### OPTİMİZASYON: useCallback ###
  const handleSort = useCallback((field: keyof TransactionHistoryItem) => {
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
  }, []); // Bağımlılığı yok

  // ### OPTİMİZASYON: useCallback ###
  // Filtre Değişikliği
  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  }, []); // Bağımlılığı yok


  // ### OPTİMİZASYON: useCallback ###
  const clearFilters = useCallback(() => {
    setFilters({ searchTerm: '', transactionType: '', status: '', dateStart: '', dateEnd: '' });
    setCurrentPage(1);
  }, []); // Bağımlılığı yok

  // ### DROPDOWN MENÜ STATE ###
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownButtonRef = useRef<HTMLButtonElement | null>(null);

  // Dropdown dışına tıklanınca kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && !(event.target as Element).closest(`.${pageStyles.dropdownMenu}`) && 
          !(event.target as Element).closest(`.${pageStyles.moreButton}`)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const toggleDropdown = useCallback((id: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (openDropdownId === id) {
      setOpenDropdownId(null);
    } else {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      // Menüyü butonun sağ alt köşesine konumlandır
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX - 180 // 180px menü genişliği
      });
      setOpenDropdownId(id);
    }
  }, [openDropdownId]);

  // ### EYLEM HANDLERLERİ ###
  const handleViewDetails = useCallback((id: string) => {
    setOpenDropdownId(null);
    router.push(`/islem-gecmisi/${id}`);
  }, [router]);

  const handleDownloadInvoice = useCallback((id: string) => {
    console.log('Fatura indiriliyor, İşlem ID:', id);
    setOpenDropdownId(null);
    // TODO: Backend API çağrısı
  }, []);

  const handleReportIssue = useCallback((id: string) => {
    console.log('Sorun bildiriliyor, İşlem ID:', id);
    setOpenDropdownId(null);
    // TODO: Modal veya form açma
  }, []);

  const handleRepeatOrder = useCallback((id: string, type: TransactionType) => {
    console.log('Tekrar sipariş, İşlem ID:', id, 'Tip:', type);
    setOpenDropdownId(null);
    // TODO: Sepete ekleme
  }, []);

  // ### DROPDOWN MENU COMPONENT (PORTAL) ###
  const renderDropdownMenu = (item: TransactionHistoryItem) => {
    if (openDropdownId !== item.id) return null;
    
    const showInvoice = item.status === 'Tamamlandı' && (item.type === 'Alış' || item.type === 'Satış');
    const showRepeat = item.type === 'Alış' && item.status === 'Tamamlandı';

    const menuContent = (
      <div 
        className={pageStyles.dropdownMenu}
        style={{ 
          position: 'fixed',
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          zIndex: 9999
        }}
      >
        <button className={pageStyles.dropdownItem} onClick={() => handleViewDetails(item.id)}>
          <ViewIcon />
          <span>Detayları Görüntüle</span>
        </button>
        
        {showInvoice && (
          <button className={pageStyles.dropdownItem} onClick={() => handleDownloadInvoice(item.id)}>
            <InvoiceIcon />
            <span>Fatura Görüntüle</span>
          </button>
        )}
        
        <button className={`${pageStyles.dropdownItem} ${pageStyles.dropdownItemDanger}`} onClick={() => handleReportIssue(item.id)}>
          <AlertIcon />
          <span>İşlem İtirazı</span>
        </button>
        
        {showRepeat && (
          <button className={pageStyles.dropdownItem} onClick={() => handleRepeatOrder(item.id, item.type)}>
            <RepeatIcon />
            <span>Tekrar Sipariş Ver</span>
          </button>
        )}
      </div>
    );

    // Portal ile body'ye render et
    if (typeof window !== 'undefined') {
      return createPortal(menuContent, document.body);
    }
    return null;
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
                <button 
                  className={`${pageStyles.actionButton} ${pageStyles.moreButton}`} 
                  onClick={(e) => toggleDropdown(item.id, e)}
                  title="Eylemler"
                >
                  <MoreIcon />
                </button>
                {renderDropdownMenu(item)}
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