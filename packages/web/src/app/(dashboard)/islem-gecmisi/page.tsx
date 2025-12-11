// src/app/(dashboard)/islem-gecmisi/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './islem-gecmisi.module.css';

import { TransactionHistory } from '@/components/features/transactions';
import { useAuth } from '@/store/AuthContext';

import { TransactionHistoryItem } from '@/lib/dashboardData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export default function IslemGecmisiPage() {
  const [history, setHistory] = useState<TransactionHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/transactions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('İşlem geçmişi yüklenemedi');
        }

        const data = await response.json();
        
        // Backend'den gelen veriyi frontend formatına dönüştür
        const formattedData: TransactionHistoryItem[] = data.map((t: any) => ({
          id: t.id,
          date: t.date,
          type: t.type,
          productName: t.productName || undefined,
          counterparty: t.counterparty || undefined,
          amount: t.amount,
          status: t.status,
        }));

        setHistory(formattedData);
      } catch (err) {
        console.error('İşlem geçmişi hatası:', err);
        setError('İşlem geçmişi yüklenirken hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [token]);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>İşlem Geçmişi</h1>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>İşlem geçmişi yükleniyor...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#ef4444' }}>{error}</div>
      ) : history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: '#6b7280' }}>
          Henüz işlem geçmişi bulunmuyor.
        </div>
      ) : (
        <TransactionHistory data={history} />
      )}
    </div>
  );
}