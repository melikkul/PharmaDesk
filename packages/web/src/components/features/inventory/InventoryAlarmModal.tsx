// src/components/features/inventory/InventoryAlarmModal.tsx
'use client';

import React, { useState } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { MedicationItem } from '@/lib/dashboardData';
import styles from './inventory.module.css';

export interface InventoryAlarmModalProps {
  medication: MedicationItem;
  onClose: () => void;
  onSave: (medicationId: number, minStock: number) => void;
}

const InventoryAlarmModal: React.FC<InventoryAlarmModalProps> = ({ 
  medication, 
  onClose, 
  onSave 
}) => {
  const [minStock, setMinStock] = useState<number>(10);

  const handleSave = () => {
    onSave(medication.id, minStock);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Stok Alarmı Kur - ${medication.productName}`}
      size="small"
      actions={
        <>
          <Button onClick={onClose} variant="secondary">
            İptal
          </Button>
          <Button onClick={handleSave} variant="primary">
            Kaydet
          </Button>
        </>
      }
    >
      <div className={styles.modalBody}>
        <p className={styles.modalDesc}>
          Bu ilaç için minimum stok seviyesi belirleyin. Stok bu seviyenin altına düştüğünde bildirim alacaksınız.
        </p>
        <div className={styles.formGroup}>
          <label htmlFor="minStock">Minimum Stok Adedi:</label>
          <Input
            id="minStock"
            type="number"
            min={1}
            value={minStock.toString()}
            onChange={(e) => setMinStock(Number(e.target.value))}
          />
        </div>
        <div className={styles.currentStockInfo}>
          <strong>Mevcut Stok:</strong> {medication.stock}
        </div>
      </div>
    </Modal>
  );
};

export default InventoryAlarmModal;
