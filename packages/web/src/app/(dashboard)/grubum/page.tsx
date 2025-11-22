// src/app/(dashboard)/grubum/page.tsx
'use client';

// ### OPTİMİZASYON: 'useCallback' import edildi ###
import React, { useState, useMemo, useCallback } from 'react';
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './grubum.module.css';
import tableStyles from '@/components/dashboard/Table.module.css';
import filterStyles from '@/app/(dashboard)/tekliflerim/InventoryFilter.module.css';

// GÜNCELLEME: Layout'taki hook'u import et
import { useDashboardContext } from '@/context/DashboardContext';

// VERİLER
import {
  otherPharmaciesData,
  PharmacyProfileData,
} from '@/data/dashboardData';

// İkonlar
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>;
const MessageIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>;

interface GroupFilterState {
  searchTerm: string;
  district: string;
  status: 'all' | 'positive' | 'negative';
  dateStart: string;
  dateEnd: string;
}

export default function GrubumPage() {
  
  // 1. ADIM: Context'ten (layout'tan) gelen fonksiyonu al
  const { handleStartChat } = useDashboardContext();
  
  const [filters, setFilters] = useState<GroupFilterState>({
    searchTerm: '',
    district: 'all',
    status: 'all',
    dateStart: '',
    dateEnd: '',
  });
  
  // Veri (normalde prop veya API'den gelir, şimdilik sabit)
  const allOtherPharmacies = useMemo(() => [...otherPharmaciesData], []);

  const availableDistricts = useMemo(() => {
    const districts = new Set(allOtherPharmacies.map(p => p.district).filter(Boolean));
    return ['all', ...Array.from(districts).sort()];
  }, [allOtherPharmacies]);

  const filteredPharmacies = useMemo(() => {
      const filtered = allOtherPharmacies.filter(p => {
          const matchesSearch = filters.searchTerm === '' || 
                                p.pharmacyName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                                p.pharmacistInCharge.toLowerCase().includes(filters.searchTerm.toLowerCase());
          const matchesDistrict = filters.district === 'all' || p.district === filters.district;
          const matchesStatus = filters.status === 'all' ||
                                (filters.status === 'positive' && p.grupYuku >= 0) ||
                                (filters.status === 'negative' && p.grupYuku < 0);
          
          // Tarih filtrelemesi için 'kayitTarihi' string'ini Date objesine çevir
          // ve sadece geçerli tarihler için filtre yap
          let matchesDateStart = true;
          let matchesDateEnd = true;
          
          if(p.kayitTarihi) {
            const kayitTarihi = new Date(p.kayitTarihi);
            if (!isNaN(kayitTarihi.getTime())) { // Geçerli tarih mi?
              matchesDateStart = filters.dateStart === '' || kayitTarihi >= new Date(filters.dateStart);
              matchesDateEnd = filters.dateEnd === '' || kayitTarihi <= new Date(filters.dateEnd);
            }
          }

          return matchesSearch && matchesDistrict && matchesStatus && matchesDateStart && matchesDateEnd;
      });
      return filtered;
  }, [allOtherPharmacies, filters]);
  
  // --- Lokal handleStartChat SİLİNDİ ---
  
  // ### OPTİMİZASYON: useCallback ###
  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  }, []); // Bağımlılığı yok

  // ### OPTİMİZASYON: useCallback ###
  const clearFilters = useCallback(() => {
    setFilters({
      searchTerm: '',
      district: 'all',
      status: 'all',
      dateStart: '',
      dateEnd: '',
    });
  }, []); // Bağımlılığı yok

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Grubum</h1>
      </div>

      <div className={filterStyles.filterContainer} style={{ marginBottom: 0 }}>
         <div className={filterStyles.filterControls} style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr auto', gap: '10px' }}>
            <div className={styles.searchWrapper}>
                <SearchIcon />
                <input 
                  type="text" 
                  name="searchTerm"
                  placeholder="Eczane Adı Ara..."
                  className={styles.actionSearch}
                  style={{ width: '100%' }}
                  value={filters.searchTerm}
                  onChange={handleFilterChange}
                />
            </div>
            <select
              name="district"
              value={filters.district}
              onChange={handleFilterChange}
              className={filterStyles.filterSelect}
            >
              {availableDistricts.map(d => (
                <option key={d} value={d}>{d === 'all' ? 'Tüm İlçeler' : d}</option>
              ))}
            </select>
             <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className={filterStyles.filterSelect}
            >
              <option value="all">Tüm Durumlar</option>
              <option value="positive">Artıda Olanlar</option>
              {/* === DÜZELTME BURADA: value_grupYuku -> value === */}
              <option value="negative">Ekside Olanlar</option>
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
      </div>

      <div className={styles.tableContainer}>
        {filteredPharmacies.length === 0 ? (
            <div className={styles.emptyState}>
                Bu filtrede eczane bulunamadı.
            </div>
        ) : (
          <table className={tableStyles.table}>
            <thead>
              <tr>
                <th>Eczane Adı</th>
                <th>İlçe</th>
                <th className={tableStyles.textRight}>Bakiye</th>
                <th className={tableStyles.textRight}>Grup Yükü</th>
                <th className={tableStyles.textRight}>Alım Sayısı</th>
                <th className={tableStyles.textRight}>Alım Tutarı</th>
                <th className={tableStyles.textRight}>Sistem Kazancı</th>
                <th className={tableStyles.textRight}>Teklif Sayısı</th>
                <th className={tableStyles.textRight}>Gönderi</th>
                <th className={tableStyles.textRight}>Gönderi Tutarı</th>
                <th className={tableStyles.textRight}>Gruba Kazandırdığı</th>
                <th>Eylemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredPharmacies.map((pharmacy) => (
                <tr key={pharmacy.username}>
                  <td className={tableStyles.fontBold}>{pharmacy.pharmacyName}</td>
                  <td>{pharmacy.district}</td>
                  <td className={`${tableStyles.textRight} ${pharmacy.balance < 0 ? tableStyles.textRed : ''}`}>
                    {pharmacy.balance.toFixed(2)} ₺
                  </td>
                   <td className={`${tableStyles.textRight} ${pharmacy.grupYuku < 0 ? tableStyles.textRed : ''}`}>
                    {pharmacy.grupYuku.toFixed(2)} ₺
                  </td>
                  <td className={tableStyles.textRight}>{pharmacy.alimSayisi}</td>
                  <td className={tableStyles.textRight}>{pharmacy.alimTutari.toFixed(2)} ₺</td>
                  <td className={tableStyles.textRight}>{pharmacy.sistemKazanci.toFixed(2)} ₺</td>
                  <td className={tableStyles.textRight}>{pharmacy.teklifSayisi}</td>
                  <td className={tableStyles.textRight}>{pharmacy.gonderiAdet}</td>
                  <td className={tableStyles.textRight}>{pharmacy.gonderiTutari.toFixed(2)} ₺</td>
                  <td className={`${tableStyles.textRight} ${tableStyles.fontBold} ${pharmacy.grubaKazandirdigi < 0 ? tableStyles.textRed : tableStyles.textGreen}`}>
                    {pharmacy.grubaKazandirdigi.toFixed(2)} ₺
                  </td>
                  <td>
                    {/* 2. ADIM: Context'teki fonksiyonu butona bağla */}
                    <button 
                      className={styles.cardButton}
                      onClick={() => handleStartChat(pharmacy)} // pharmacy verisini fonksiyona yolla
                    >
                      <MessageIcon />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}