// src/app/(dashboard)/siparisler/page.tsx
'use client';

import React, { useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import OrdersTable from './OrdersTable';
import styles from './siparisler.module.css';

export default function SiparislerPage() {
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  
  const { orders: incomingOrders, loading: loadingIncoming, error: errorIncoming } = useOrders('buyer');
  const { orders: outgoingOrders, loading: loadingOutgoing, error: errorOutgoing } = useOrders('seller');

  const currentOrders = activeTab === 'incoming' ? incomingOrders : outgoingOrders;
  const currentLoading = activeTab === 'incoming' ? loadingIncoming : loadingOutgoing;
  const currentError = activeTab === 'incoming' ? errorIncoming : errorOutgoing;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Siparişlerim</h1>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'incoming' ? styles.active : ''}`}
          onClick={() => setActiveTab('incoming')}
        >
          Gelen Siparişler
          {!loadingIncoming && <span className={styles.badge}>{incomingOrders.length}</span>}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'outgoing' ? styles.active : ''}`}
          onClick={() => setActiveTab('outgoing')}
        >
          Giden Siparişler
          {!loadingOutgoing && <span className={styles.badge}>{outgoingOrders.length}</span>}
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {currentLoading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>Siparişler yükleniyor...</div>
        ) : currentError ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>Hata: {currentError}</div>
        ) : currentOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
            {activeTab === 'incoming' ? 'Henüz gelen sipariş bulunmuyor.' : 'Henüz giden sipariş bulunmuyor.'}
          </div>
        ) : (
          <OrdersTable orders={currentOrders} type={activeTab} />
        )}
      </div>
    </div>
  );
}
