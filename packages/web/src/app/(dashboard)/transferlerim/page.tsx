// src/app/(dashboard)/transferlerim/page.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './transferlerim.module.css';

import TransfersTable from './TransfersTable';

// ✅ Backend'den transferleri çek
import { useShipments } from '@/hooks/useShipments';

export default function TransferlerimPage() {
  const router = useRouter();

  // ✅ Backend'den shipments/transfers çek
  const { shipments, loading, error } = useShipments();

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ textAlign: 'center', padding: '50px' }}>Transferler yükleniyor...</div>
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

  // Backend ShipmentDto already matches expected format - minimal conversion needed
  const formattedShipments = shipments.map(shipment => ({
    id: shipment.id,
    orderNumber: shipment.orderNumber,
    productName: shipment.productName, // Backend already has it
    quantity: shipment.quantity,
    trackingNumber: shipment.trackingNumber,
    date: shipment.date,
    transferType: shipment.transferType,
    counterparty: shipment.counterparty,
    shippingProvider: shipment.shippingProvider,
    status: shipment.status as any,
    trackingHistory: shipment.trackingHistory || [],
  }));

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Transferlerim</h1>
      </div>

      {formattedShipments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>Henüz transfer bulunmuyor.</div>
      ) : (
        <TransfersTable data={formattedShipments} />
      )}
    </div>
  );
}