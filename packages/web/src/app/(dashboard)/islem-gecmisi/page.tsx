// src/app/(dashboard)/islem-gecmisi/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './islem-gecmisi.module.css';

import { TransactionHistory } from '@/components/features/transactions';

import {
  transactionHistoryData as initialTransactionHistory,
  TransactionHistoryItem
} from '@/lib/dashboardData';

export default function IslemGecmisiPage() {
  const [history, setHistory] = useState<TransactionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log("İşlem geçmişi yükleniyor...");
    setTimeout(() => {
        setHistory(initialTransactionHistory);
        setIsLoading(false);
        console.log("İşlem geçmişi yüklendi.");
    }, 500);
  }, []);

  return (
        <div className={styles.pageContainer}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>İşlem Geçmişi</h1>
          </div>

          {isLoading ? (
             <div style={{ textAlign: 'center', padding: '50px' }}>İşlem geçmişi yükleniyor...</div>
          ) : (
            <TransactionHistory data={history} />
          )}
        </div>
  );
}