// packages/web/src/app/(dashboard)/envanterim/page.tsx
'use client';

import React from 'react';
import { useInventory } from '@/hooks/useInventory';
import { InventoryList } from '@/components/features/inventory';
import styles from './envanterim.module.css';

export default function EnvanterimPage() {
  // ✅ Backend'den envanter verisi çek
  const { inventory, loading, error } = useInventory();

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

  // Convert API data to match the expected format for InventoryList
  const inventoryData = inventory.map((item: any) => ({
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
      </div>

      <InventoryList data={inventoryData} />
    </div>
  );
}