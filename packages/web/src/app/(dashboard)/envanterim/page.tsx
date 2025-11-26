// packages/web/src/app/(dashboard)/envanterim/page.tsx
'use client';

import React, { useState } from 'react';
import FullInventoryTable from './FullInventoryTable';
import { useInventory } from '@/hooks/useInventory';
import styles from './envanterim.module.css';
import SetBulkAlarmModal from './SetBulkAlarmModal';

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
  const [isBulkAlarmModalOpen, setIsBulkAlarmModalOpen] = useState(false);
  
  // ✅ Backend'den envanter verisi çek
  const { inventory, loading, error } = useInventory();

  const handleSaveBulkAlarm = (minStock: number) => {
    console.log(`TOPLU ALARM KURULDU: Varsayılan limit ${minStock} olarak ayarlandı.`);
    alert(`Varsayılan stok alarmı ${minStock} adet olarak ayarlandı.`);
    setIsBulkAlarmModalOpen(false);
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '50px' }}>Envanter yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>Hata: {error}</div>
      </div>
    );
  }

  // Convert API data to match the expected format for FullInventoryTable
  const inventoryData = inventory.map(item => ({
    id: item.id,
    productName: item.medication?.name || 'Bilinmeyen İlaç',
    barcode: item.medication?.barcode || '-',
    currentStock: item.quantity,
    bonusStock: item.bonusQuantity,
    costPrice: item.costPrice,
    stock: item.quantity.toString(),
    price: item.salePrice || item.costPrice,
    dateAdded: new Date().toISOString(),
    expirationDate: item.expiryDate,
    status: (item.quantity > (item.minStockLevel || 0) ? 'active' : 'low_stock') as any,
    alarmSet: item.isAlarmSet,
  }));

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Envanterim</h1>
        
        <button 
          className={styles.secondaryButton} 
          onClick={() => setIsBulkAlarmModalOpen(true)}
        >
          <AlarmsIcon />
          <span>Toplu Alarm Ayarla</span>
        </button>
      </div>

      <FullInventoryTable data={inventoryData} />

      {isBulkAlarmModalOpen && (
        <SetBulkAlarmModal
          onClose={() => setIsBulkAlarmModalOpen(false)}
          onSave={handleSaveBulkAlarm}
        />
      )}
    </div>
  );
}