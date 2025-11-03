// packages/web/src/app/(dashboard)/envanterim/page.tsx
'use client';

import React, { useState } from 'react';
import FullInventoryTable from './FullInventoryTable';
import { fullInventoryData } from '@/data/dashboardData';
import styles from './envanterim.module.css';

// Toplu alarm modal'ı import edildi
import SetBulkAlarmModal from './SetBulkAlarmModal';

// Toplu alarm ikonu
const AlarmsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    <path d="M2 8c0-3.31 2.69-6 6-6s6 2.69 6 6c0 7-3 9-3 9H5s-3-2-3-9z"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    <path d="M21 11.5v-1a6 6 0 0 0-5.45-5.96"></path>
  </svg>
);


export default function EnvanterimPage() {
  // Toplu alarm modal'ı için state
  const [isBulkAlarmModalOpen, setIsBulkAlarmModalOpen] = useState(false);

  // Normalde burada API'den gelen tam envanter verisi olur
  const inventoryData = fullInventoryData;

  // Toplu alarmı kaydetme fonksiyonu
  const handleSaveBulkAlarm = (minStock: number) => {
    console.log(`TOPLU ALARM KURULDU: Varsayılan limit ${minStock} olarak ayarlandı.`);
    
    // Bu noktada backend'e bu varsayılan limit kaydedilir.
    // Backend, tüm ilaçları kontrol ederken, özel alarmı olmayan
    // ilaçlar için bu varsayılan limiti baz alır.
    
    alert(`Varsayılan stok alarmı ${minStock} adet olarak ayarlandı.`);
    setIsBulkAlarmModalOpen(false); // Modalı kapat
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Envanterim</h1>
        
        {/* Toplu Alarm Butonu */}
        <button 
          className={styles.secondaryButton} 
          onClick={() => setIsBulkAlarmModalOpen(true)}
        >
          <AlarmsIcon />
          <span>Toplu Alarm Ayarla</span>
        </button>
      </div>

      {/* Burada normalde filtre bileşenleri olur. 
        <InventoryFilter /> 
      */}

      <FullInventoryTable data={inventoryData} />

      {/* Toplu alarm modal'ını burada render et */}
      {isBulkAlarmModalOpen && (
        <SetBulkAlarmModal
          onClose={() => setIsBulkAlarmModalOpen(false)}
          onSave={handleSaveBulkAlarm}
        />
      )}
    </div>
  );
}