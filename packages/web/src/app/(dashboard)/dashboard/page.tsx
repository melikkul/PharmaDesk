// src/app/(dashboard)/dashboard/page.tsx
'use client'; 

import React from 'react';

// KART BİLEŞENLERİ
import OffersCard from '@/components/dashboard/OffersCard';
import BalanceHistoryCard from '@/components/dashboard/BalanceHistoryCard';
import TransfersCard from '@/components/dashboard/TransfersCard';
import ShipmentsCard from '@/components/dashboard/ShipmentsCard';

// HOOK
import { useDashboard } from '@/hooks/useDashboard';

// Her kart için ayrı limitler
const OFFERS_LIMIT = 5;
const BALANCE_HISTORY_LIMIT = 5;
const ORDERS_LIMIT = 5;      // SİPARİŞLERİM kartı
const TRANSFERS_LIMIT = 5;   // TRANSFERLERİM kartı

export default function DashboardPage() {
  const { data, loading, error } = useDashboard();

  if (loading) {
    return <div className="p-10 text-center">Yükleniyor...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-red-500">{error}</div>;
  }

  if (!data) {
    return null;
  }

  // 🆕 Subscription blur is now handled at layout level - no need for blur logic here
  return (
    <div className="content-grid">
      <div id="dashboard-stats"> 
        <OffersCard data={data.recentOffers || []} limit={OFFERS_LIMIT} />
      </div>
      <div id="balance-history">
        <BalanceHistoryCard data={data.balanceHistory || []} limit={BALANCE_HISTORY_LIMIT} />
      </div>
      <div id="orders">
        <TransfersCard data={data.recentOrders || []} limit={ORDERS_LIMIT} />
      </div>
      <div id="transfers">
        <ShipmentsCard data={data.shipments || []} limit={TRANSFERS_LIMIT} />
      </div>
    </div>
  );
}