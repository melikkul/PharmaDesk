// packages/web/src/app/(dashboard)/envanterim/SetBulkAlarmModal.tsx
'use client';

import React, { useState } from 'react';
// DİKKAT: Stilleri SetAlarmModal'dan yeniden kullanıyoruz
import styles from './SetAlarmModal.module.css'; 

interface SetBulkAlarmModalProps {
  onClose: () => void;
  onSave: (minStock: number) => void;
}

const SetBulkAlarmModal: React.FC<SetBulkAlarmModalProps> = ({ onClose, onSave }) => {
  // Normalde burada backend'den varsayılan alarm ayarı çekilir.
  const [minStock, setMinStock] = useState('5');

  const handleSave = () => {
    const minStockValue = parseInt(minStock, 10) || 0;
    if (minStockValue > 0) {
      onSave(minStockValue);
    } else {
      alert("Lütfen geçerli bir minimum stok adedi girin.");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        
        <div className={styles.modalHeader}>
          <h3>Toplu Stok Alarmı Ayarla</h3>
          <p>Tüm envanter için varsayılan bir limit belirleyin.</p>
        </div>
        
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label htmlFor="minStock">Varsayılan Minimum Stok Adedi</label>
            <input
              type="number"
              id="minStock"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="Örn: 5"
              min="1"
            />
            <p className={styles.subtleText}>
              Stoğu bu adedin altına düşen herhangi bir ilaç için bildirim alacaksınız.
              <br/>
              <strong>Not:</strong> İlaç bazlı kurduğunuz özel alarmlar, bu varsayılan ayarı geçersiz kılar.
            </p>
          </div>
        </div>
        
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.btnSecondary}>
            İptal
          </button>
          <button onClick={handleSave} className={styles.btnPrimary}>
            Kaydet
          </button>
        </div>

      </div>
    </div>
  );
};

export default SetBulkAlarmModal;