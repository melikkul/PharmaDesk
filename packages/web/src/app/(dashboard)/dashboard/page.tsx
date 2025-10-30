// src/app/(dashboard)/dashboard/page.tsx
'use client'; 

import React from 'react';

// KART BİLEŞENLERİ - DÜZELTİLMİŞ YOLLAR
// ../../components -> @/components olarak değiştirildi
import OffersCard from '@/components/dashboard/OffersCard';
import BalanceHistoryCard from '@/components/dashboard/BalanceHistoryCard';
import TransfersCard from '@/components/dashboard/TransfersCard';
import ShipmentsCard from '@/components/dashboard/ShipmentsCard';

// VERİLER - DÜZELTİLMİŞ YOLLAR
// ../../data/dashboardData -> @/data/dashboardData olarak değiştirildi
import {
  offersData,
  balanceHistoryData,
  transfersData,
  shipmentsData,
} from '@/data/dashboardData';


export default function DashboardPage() {
  // Her kart için ayrı limitler
  const OFFERS_LIMIT = 4;
  const BALANCE_HISTORY_LIMIT = 5;
  const TRANSFERS_LIMIT = 4;
  const SHIPMENTS_LIMIT = 4;

  // --- TÜM STATE VE FONKSİYONLAR (dashboard)/layout.tsx'e taşındı ---
  // Bu dosya artık sadece içeriği göstermekle sorumlu.

  return (
    <div className="content-grid">
      <OffersCard data={offersData} limit={OFFERS_LIMIT} />
      <BalanceHistoryCard data={balanceHistoryData} limit={BALANCE_HISTORY_LIMIT} />
      <TransfersCard data={transfersData} limit={TRANSFERS_LIMIT} />
      <ShipmentsCard data={shipmentsData} limit={SHIPMENTS_LIMIT} />
    </div>
  );
}