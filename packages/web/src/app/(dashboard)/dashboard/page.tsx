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
const OFFERS_LIMIT = 4;
const BALANCE_HISTORY_LIMIT = 5;
const TRANSFERS_LIMIT = 4;
const SHIPMENTS_LIMIT = 4;

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

  return (
    <div className="content-grid">
      <div id="dashboard-stats"> 
        {/* Veriler API'den gelene kadar boş liste veya mock veri dönebilir */}
        <OffersCard data={data.recentOffers || []} limit={OFFERS_LIMIT} />
      </div>
      <div id="balance-history">
        <BalanceHistoryCard data={data.balanceHistory || []} limit={BALANCE_HISTORY_LIMIT} />
      </div>
      <div id="transfers">
        <TransfersCard data={data.transfers || []} limit={TRANSFERS_LIMIT} />
      </div>
      <div id="shipments">
        <ShipmentsCard data={data.shipments || []} limit={SHIPMENTS_LIMIT} />
      </div>
    </div>
  );
}