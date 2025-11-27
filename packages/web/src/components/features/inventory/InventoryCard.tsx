// src/components/features/inventory/InventoryCard.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { MedicationItem } from '@/lib/dashboardData';
import { PriceDisplay, StatusBadge, DateDisplay } from '@/components/common';
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

interface InventoryCardProps {
  medication: MedicationItem;
  onSetAlarm: (med: MedicationItem) => void;
}

const InventoryCard: React.FC<InventoryCardProps> = ({ medication: med, onSetAlarm }) => {
  return (
    <div className={styles.inventoryCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>{med.productName}</h3>
        <StatusBadge status={med.status} type="inventory" />
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardRow}>
          <span className={styles.cardLabel}>Barkod:</span>
          <span className={styles.cardValue}>{med.barcode || 'N/A'}</span>
        </div>

        <div className={styles.cardRow}>
          <span className={styles.cardLabel}>Stok:</span>
          <span className={styles.cardValue}>{med.stock}</span>
        </div>

        <div className={styles.cardRow}>
          <span className={styles.cardLabel}>Maliyet:</span>
          <span className={styles.cardValue}>
            {med.costPrice ? <PriceDisplay amount={med.costPrice} /> : 'N/A'}
          </span>
        </div>

        <div className={styles.cardRow}>
          <span className={styles.cardLabel}>SKT:</span>
          <span className={styles.cardValue}>
            {med.expirationDate ? <DateDisplay date={med.expirationDate} format="date" /> : 'N/A'}
          </span>
        </div>
      </div>

      <div className={styles.cardActions}>
        {med.status === 'active' || med.status === 'paused' ? (
          <Link
            href={`/tekliflerim/${med.id}`}
            className={styles.cardButton}
            title="Teklifi Düzenle"
          >
            <EditIcon />
            <span>Düzenle</span>
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
            className={styles.cardButton}
            title="Bu İlaçtan Teklif Ver"
          >
            <OfferIcon />
            <span>Teklif Ver</span>
          </Link>
        )}

        <button
          className={styles.cardButton}
          onClick={() => onSetAlarm(med)}
          title="Stok Alarmı Kur"
        >
          <AlarmIcon />
          <span>Alarm</span>
        </button>
      </div>
    </div>
  );
};

export default InventoryCard;
