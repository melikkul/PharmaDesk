// src/components/features/inventory/InventoryList.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MedicationItem } from '@/lib/dashboardData';
import { PriceDisplay, StatusBadge, DateDisplay } from '@/components/common';
import InventoryAlarmModal from './InventoryAlarmModal';
import InventoryCard from './InventoryCard';
import styles from './inventory.module.css';

// Icons
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

export interface InventoryListProps {
  data: MedicationItem[];
}

const InventoryList: React.FC<InventoryListProps> = ({ data }) => {
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
      {/* Mobile & Tablet: Card View */}
      <div className={styles.mobileCardView}>
        {data.map((med) => (
          <InventoryCard 
            key={med.id} 
            medication={med} 
            onSetAlarm={setAlarmMedication} 
          />
        ))}
      </div>

      {/* Desktop: Table View */}
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
            {data.map((med) => (
              <tr key={med.id}>
                {/* İlaç Adı */}
                <td className={styles.productName}>{med.productName}</td>
                
                {/* Barkod */}
                <td>{med.barcode || 'N/A'}</td>
                
                {/* Stok */}
                <td>{med.stock}</td>
                
                {/* Maliyet - PriceDisplay kullanıyoruz */}
                <td>
                  {med.costPrice ? (
                    <PriceDisplay amount={med.costPrice} />
                  ) : (
                    'N/A'
                  )}
                </td>
                
                {/* SKT - DateDisplay kullanıyoruz */}
                <td>
                  {med.expirationDate ? (
                    <DateDisplay date={med.expirationDate} format="date" />
                  ) : (
                    'N/A'
                  )}
                </td>
                
                {/* Durum - StatusBadge kullanıyoruz */}
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
        <InventoryAlarmModal
          medication={alarmMedication}
          onClose={() => setAlarmMedication(null)}
          onSave={handleSetAlarm}
        />
      )}
    </>
  );
};

export default InventoryList;
