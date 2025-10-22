// src/components/ilaclar/FilterPanel.tsx
import React from 'react';
import styles from './FilterPanel.module.css';

const FilterPanel = () => {
  const manufacturers = ['Abdi İbrahim', 'Atabay', 'Sanofi', 'Bayer', 'Reckitt', 'Novartis', 'Sandoz', 'Pfizer'];

  return (
    // YENİ KORUYUCU SARMALAYICI: Bu div, tüm bileşeni dış stillerden izole eder.
    <div className={styles.filterPanelWrapper}>
      <div className={styles.filterGrid}>
        
        <div className={styles.filterGroup}>
          <label className={styles.groupTitle}>Teklif Türü</label>
          <div className={styles.checkboxWrapper}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" /> Mal Fazlası
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" /> Miadı Yakın
            </label>
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.groupTitle}>Fiyat Aralığı (₺)</label>
          <div className={styles.priceInputs}>
            <input type="number" placeholder="En Az" className={styles.inputBase} />
            <input type="number" placeholder="En Çok" className={styles.inputBase} />
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="manufacturer" className={styles.groupTitle}>Üretici Firma</label>
          <select id="manufacturer" className={styles.inputBase}>
            <option value="">Tüm Firmalar</option>
            {manufacturers.map(firm => (
              <option key={firm} value={firm}>{firm}</option>
            ))}
          </select>
        </div>
        
        <div className={styles.filterGroup}>
          <label htmlFor="expDate" className={styles.groupTitle}>En Yakın S.K.T.</label>
          <input id="expDate" type="month" className={styles.inputBase} />
        </div>

      </div>

      <div className={styles.buttonGroup}>
        <button className={styles.clearBtn}>Filtreyi Temizle</button>
        <button className={styles.applyBtn}>Uygula</button>
      </div>
    </div>
  );
};

export default FilterPanel;