// packages/web/src/app/(dashboard)/envanterim/FullInventoryTable.tsx
'use client';

import React, { useState } from 'react';
import { MedicationItem } from '@/data/dashboardData';
import styles from './envanterim.module.css';
import Link from 'next/link';
import SetAlarmModal from './SetAlarmModal'; // Modal bileşeni import edildi

// Alarm (zil) ikonu
const AlarmIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

// Düzenle (kalem) ikonu
const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

// Teklif Ver (dolar) ikonu
const OfferIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
);

const FullInventoryTable: React.FC<FullInventoryTableProps> = ({ data: filteredData }) => {
  
  // Hangi ilacın alarmı ayarlanıyorsa onu state'de tut
  const [alarmMedication, setAlarmMedication] = useState<MedicationItem | null>(null);

  // Alarmı kaydetme fonksiyonu
  const handleSetAlarm = (medicationId: number, minStock: number) => {
    console.log(
      `ALARM KURULDU: İlaç ID ${medicationId} için minimum stok ${minStock} olarak ayarlandı.`
    );
    alert("Stok alarmı başarıyla ayarlandı!\n(Bu bilgi backend'e kaydedilmek üzere simüle edildi.)");
    setAlarmMedication(null); // Modalı kapat
  };


  return (
    <>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          {/* HİDRASYON HATASI DÜZELTMESİ:
            <thead> ve <tr> arasındaki tüm yorumlar, boşluklar ve 
            yeni satırlar kaldırıldı.
          */}
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
                <td className={styles.price}>{med.costPrice?.toFixed(2) || 'N/A'} ₺</td>
                <td>{med.expirationDate}</td>
                <td>
                  <span className={`${styles.statusBadge} ${styles[med.status]}`}>
                    {med.status === 'active' ? 'Aktif Teklif' : 
                     med.status === 'paused' ? 'Duraklatıldı' : 
                     med.status === 'out_of_stock' ? 'Stok Dışı' : 
                     'Envanterde'}
                  </span>
                </td>
                
                {/* İşlemler (Teklif Ver / Düzenle) */}
                <td className={styles.actionCell}>
                  {med.status === 'active' || med.status === 'paused' ? (
                    // Zaten teklifteyse DÜZENLE
                    <Link href={`/tekliflerim/${med.id}`} className={styles.iconButton} title="Teklifi Düzenle">
                      <EditIcon />
                    </Link>
                  ) : (
                    // Teklifte değilse YENİ TEKLİF VER
                    <Link 
                      href={{
                        pathname: '/tekliflerim/yeni',
                        query: { 
                          isim: med.productName,
                          barkod: med.barcode,
                          stok: med.stock.split(' + ')[0] || '0',
                          mf: med.stock.split(' + ')[1] || '0',
                          maliyet: med.costPrice,
                          skt: med.expirationDate
                        }
                      }} 
                      className={styles.iconButton}
                      title="Bu İlaçtan Teklif Ver"
                    >
                      <OfferIcon />
                    </Link>
                  )}
                </td>

                {/* Alarm Butonu hücresi */}
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

      {/* Modal penceresini burada render et */}
      {alarmMedication && (
        <SetAlarmModal
          medication={alarmMedication}
          onClose={() => setAlarmMedication(null)}
          onSave={handleSetAlarm}
        />
      )}
    </>
  );
};

export default FullInventoryTable;