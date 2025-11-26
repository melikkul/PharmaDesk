// packages/web/src/app/(dashboard)/envanterim/FullInventoryTable.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MedicationItem } from '@/lib/dashboardData';
import { PriceDisplay, StatusBadge } from '@/components/common';
import { Modal } from '@/components/ui';
import styles from './envanterim.module.css';
const AlarmIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const OfferIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

// ===== ALARM MODAL COMPONENT =====
interface AlarmModalProps {
  medication: MedicationItem;
  onClose: () => void;
  onSave: (medicationId: number, minStock: number) => void;
}

const AlarmModal: React.FC<AlarmModalProps> = ({ medication, onClose, onSave }) => {
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
          <button onClick={onClose} className={styles.btnSecondary}>
            İptal
          </button>
          <button onClick={handleSave} className={styles.btnPrimary}>
            Kaydet
          </button>
        </>
      }
    >
      <div className={styles.modalBody}>
        <p className={styles.modalDesc}>
          Bu ilaç için minimum stok seviyesi belirleyin. Stok bu seviyenin altına düştüğünde bildirim alacaksınız.
        </p>
        <div className={styles.formGroup}>
          <label htmlFor="minStock">Minimum Stok Adedi:</label>
          <input
            id="minStock"
            type="number"
            min="1"
            value={minStock}
            onChange={(e) => setMinStock(Number(e.target.value))}
            className={styles.input}
          />
        </div>
        <div className={styles.currentStockInfo}>
          <strong>Mevcut Stok:</strong> {medication.stock}
        </div>
      </div>
    </Modal>
  );
};

// ===== MAIN COMPONENT =====
interface FullInventoryTableProps {
  data: MedicationItem[];
}

const FullInventoryTable: React.FC<FullInventoryTableProps> = ({ data: filteredData }) => {
  const [alarmMedication, setAlarmMedication] = useState<MedicationItem | null>(null);

  const handleSetAlarm = (medicationId: number, minStock: number) => {
    console.log(
      `ALARM KURULDU: İlaç ID ${medicationId} için minimum stok ${minStock} olarak ayarlandı.`
    );
    alert('Stok alarmı başarıyla ayarlandı!\n(Bu bilgi backend\'e kaydedilmek üzere simüle edildi.)');
    setAlarmMedication(null);
  };

  return (
    <>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>İlaç Adı</th>
              <th>Barkod</th>
              <th>Mevcut Stok</th>
              <th>Maliyet</th>
              <th>SKT</th>
              <th>Durum</th>
              <th>İşlemler</th>
              <th>Alarm</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((med) => (
              <tr key={med.id}>
                <td className={styles.productName}>{med.productName}</td>
                <td>{med.barcode || 'N/A'}</td>
                <td>{med.stock}</td>
                <td className={styles.price}>
                  {med.costPrice ? (
                    <PriceDisplay amount={med.costPrice} />
                  ) : (
                    'N/A'
                  )}
                </td>
                <td>{med.expirationDate}</td>
                <td>
                  <StatusBadge status={med.status} type="inventory" />
                </td>

                {/* İşlemler (Teklif Ver / Düzenle) */}
                <td className={styles.actionCell}>
                  {med.status === 'active' || med.status === 'paused' ? (
                    <Link
                      href={`/tekliflerim/${med.id}`}
                      className={styles.iconButton}
                      title="Teklifi Düzenle"
                    >
                      <EditIcon />
                    </Link>
                  ) : (
                    <Link
                      href={{
                        pathname: '/tekliflerim/yeni',
                        query: {
                          isim: med.productName,
                          barkod: med.barcode,
                          stok: med.stock.split(' + ')[0] || '0',
                          mf: med.stock.split(' + ')[1] || '0',
                          maliyet: med.costPrice,
                          skt: med.expirationDate,
                        },
                      }}
                      className={styles.iconButton}
                      title="Bu İlaçtan Teklif Ver"
                    >
                      <OfferIcon />
                    </Link>
                  )}
                </td>

                {/* Alarm Butonu */}
                <td className={styles.actionCell}>
                  <button
                    className={styles.iconButton}
                    onClick={() => setAlarmMedication(med)}
                    title="Stok Alarmı Kur"
                  >
                    <AlarmIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Alarm Modal */}
      {alarmMedication && (
        <AlarmModal
          medication={alarmMedication}
          onClose={() => setAlarmMedication(null)}
          onSave={handleSetAlarm}
        />
      )}
    </>
  );
};

export default FullInventoryTable;