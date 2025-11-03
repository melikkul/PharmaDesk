// src/app/(dashboard)/envanterim/FullInventoryTable.tsx
'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { MedicationItem } from '@/data/dashboardData';
import DashboardCard from '@/components/DashboardCard';
import tableStyles from '@/components/dashboard/Table.module.css';
// GÜNCELLENDİ: Import yolu (bu dosya artık mevcut olmalı)
import pageStyles from './envanterim.module.css'; 
import filterStyles from './InventoryFilter.module.css'; 

// İkonlar
const FilterIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>;
const OfferIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const EditIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;

// Tipler
interface FullInventoryTableProps {
  data: MedicationItem[];
  offerBarcodeSet: Set<string | undefined>; // Hangi ürünlerin zaten teklif verildiğini bilmek için
}

const ITEMS_PER_PAGE = 10; 

const FullInventoryTable: React.FC<FullInventoryTableProps> = ({
    data,
    offerBarcodeSet
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtreleme Mantığı (Sadece Arama)
  const filteredData = useMemo(() => {
    let filtered = [...data];
    if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(item =>
            item.productName.toLowerCase().includes(lowerSearchTerm) ||
            item.barcode?.includes(lowerSearchTerm)
        );
    }
    return filtered;
  }, [data, searchTerm]);

  // Sayfalama Mantığı
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  }, []); 

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setCurrentPage(1);
  }, []); 

  return (
    <DashboardCard title="Genel Eczane Envanteri (Eczanem Verisi)">
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
                <div className={filterStyles.filterControls} style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
                    <input
                        type="text"
                        name="searchTerm"
                        placeholder="İlaç adı veya barkod ara..."
                        value={searchTerm}
                        onChange={handleFilterChange}
                        className={filterStyles.filterInput}
                    />
                    {/* Diğer filtreler (stok, skt) buraya eklenebilir */}
                    <span />
                    <button onClick={clearFilters} className={filterStyles.clearButton}>Temizle</button>
                </div>
            )}
        </div>

      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>Ürün Adı</th>
            <th>Barkod</th>
            <th>Stok (Adet+MF)</th>
            <th>S.K.T.</th>
            <th className={tableStyles.textRight}>Maliyet Fiyatı</th>
            <th>Eylemler</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.length === 0 && (
             <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>Envanterde ürün bulunamadı.</td></tr>
          )}
          {paginatedData.map(item => {
            // Bu ürün zaten teklif listesinde mi?
            const isOffered = offerBarcodeSet.has(item.barcode);
            const linkQuery = `?barkod=${item.barcode || ''}&isim=${encodeURIComponent(item.productName)}&stok=${encodeURIComponent(item.stock.split(' + ')[0])}&mf=${encodeURIComponent(item.stock.split(' + ')[1] || '0')}&maliyet=${item.costPrice || 0}&skt=${encodeURIComponent(item.expirationDate)}`;
            
            return (
              <tr key={item.id}>
                <td>{item.productName}</td>
                <td>{item.barcode || '-'}</td>
                <td>{item.stock}</td>
                <td>{item.expirationDate}</td>
                <td className={`${tableStyles.textRight}`}>
                  {item.costPrice?.toFixed(2) || '-'} ₺
                </td>
                <td className={pageStyles.actionCell}>
                  {isOffered ? (
                    // Zaten teklifteyse, düzenleme linki (gerçek ID'yi bulup)
                    <Link 
                      href={`/tekliflerim/${item.id}`} // Simülasyon, ID'ler eşleşiyor
                      className={`${pageStyles.offerButton} ${pageStyles.isOffer}`}
                      title="Mevcut teklifi düzenle"
                    >
                      <EditIcon />
                      <span>Teklifi Düzenle</span>
                    </Link>
                  ) : (
                    // Teklifte değilse, yeni teklif oluşturma linki (query params ile)
                    <Link 
                      href={`/tekliflerim/yeni${linkQuery}`}
                      className={pageStyles.offerButton}
                      title="Bu ürünü teklife çıkar"
                    >
                      <OfferIcon />
                      <span>Teklif Ver</span>
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
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

export default FullInventoryTable;