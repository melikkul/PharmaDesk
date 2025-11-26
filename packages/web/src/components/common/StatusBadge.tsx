// src/components/common/StatusBadge.tsx
'use client';

import React from 'react';
import Badge, { BadgeVariant } from '@/components/ui/Badge';

export type StatusType = 'order' | 'offer' | 'payment' | 'inventory';

export interface StatusBadgeProps {
  status: string;
  type: StatusType;
  className?: string;
}

/**
 * Maps business status codes to Turkish labels and badge variants
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type, className = '' }) => {
  const getStatusConfig = (): { label: string; variant: BadgeVariant } => {
    const statusLower = status.toLowerCase();

    if (type === 'order') {
      switch (statusLower) {
        case 'pending':
          return { label: 'Beklemede', variant: 'warning' };
        case 'confirmed':
          return { label: 'Onaylandı', variant: 'info' };
        case 'shipped':
          return { label: 'Kargoda', variant: 'info' };
        case 'delivered':
          return { label: 'Teslim Edildi', variant: 'success' };
        case 'cancelled':
          return { label: 'İptal', variant: 'danger' };
        default:
          return { label: status, variant: 'default' };
      }
    }

    if (type === 'offer') {
      switch (statusLower) {
        case 'active':
          return { label: 'Aktif Teklif', variant: 'success' };
        case 'paused':
          return { label: 'Duraklatıldı', variant: 'warning' };
        case 'out_of_stock':
          return { label: 'Stok Dışı', variant: 'danger' };
        case 'in_warehouse':
          return { label: 'Envanterde', variant: 'default' };
        default:
          return { label: status, variant: 'default' };
      }
    }

    if (type === 'payment') {
      switch (statusLower) {
        case 'paid':
          return { label: 'Ödendi', variant: 'success' };
        case 'pending':
          return { label: 'Bekliyor', variant: 'warning' };
        case 'failed':
          return { label: 'Başarısız', variant: 'danger' };
        default:
          return { label: status, variant: 'default' };
      }
    }

    if (type === 'inventory') {
      switch (statusLower) {
        case 'active':
          return { label: 'Aktif Teklif', variant: 'success' };
        case 'paused':
          return { label: 'Duraklatıldı', variant: 'warning' };
        case 'out_of_stock':
          return { label: 'Stok Dışı', variant: 'danger' };
        case 'in_warehouse':
          return { label: 'Envanterde', variant: 'default' };
        default:
          return { label: status, variant: 'default' };
      }
    }

    return { label: status, variant: 'default' };
  };

  const { label, variant } = getStatusConfig();

  return <Badge label={label} variant={variant} className={className} />;
};

export default StatusBadge;
