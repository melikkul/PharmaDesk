// packages/web/src/app/(dashboard)/envanterim/SetAlarmModal.tsx
'use client';

import React, { useState } from 'react';
import { MedicationItem } from '@/data/dashboardData';
import styles from './SetAlarmModal.module.css';

interface SetAlarmModalProps {
  medication: MedicationItem;
  onClose: () => void;
  onSave: (medicationId: number, minStock: number) => void;
}

const SetAlarmModal: React.FC<SetAlarmModalProps> = ({ medication, onClose, onSave }) => {
  // Normalde burada backend'den bu ilaç için daha önce ayarlanmış
  // bir alarm değeri varsa o çekilir. Biz "10" olarak başlatıyoruz.
  const [minStock, setMinStock] = useState('10');

  const handleSave = () => {
    const minStockValue = parseInt(minStock, 10) || 0;
    if (minStockValue > 0) {
      onSave(medication.id, minStockValue);
    } else {
      alert("Lütfen geçerli bir minimum stok adedi girin.");
    }
  };

  // Stok ve MF'yi ayır
  const [stock, bonus] = medication.stock.split(' + ');

  return (
    // Overlay'e tıklanınca kapat
    <div className={styles.modalOverlay} onClick={onClose}>
      {/* İçeriğe tıklanması overlay'i tetiklemesin */}
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        
        <div className={styles.modalHeader}>
          <h3>Stok Alarmı Ayarla</h3>
          <p>{medication.productName}</p>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.currentStockInfo}>
            <span>Mevcut Stok: <strong>{stock}</strong></span>
            <span>Mevcut MF: <strong>{bonus || '0'}</strong></span>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="minStock">Minimum Stok Adedi</label>
            <input
              type="number"
              id="minStock"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="Örn: 10"
              min="1"
            />
            <p className={styles.subtleText}>
              Bu ilacın stoğu (MF hariç) belirlediğiniz adedin altına düştüğünde bildirim alacaksınız.
            </p>
          </div>
        </div>
        
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.btnSecondary}>
            İptal
          </button>
          <button onClick={handleSave} className={styles.btnPrimary}>
            Alarmı Kaydet
          </button>
        </div>

      </div>
    </div>
  );
};

export default SetAlarmModal;