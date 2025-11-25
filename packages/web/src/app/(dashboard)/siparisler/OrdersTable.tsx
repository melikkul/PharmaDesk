// src/app/(dashboard)/siparisler/OrdersTable.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Order } from '@/hooks/useOrders';
import styles from './siparisler.module.css';

interface OrdersTableProps {
  orders: Order[];
  type: 'incoming' | 'outgoing';
}

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusClass = () => {
    switch (status.toLowerCase()) {
      case 'pending': return styles.statusPending;
      case 'confirmed': return styles.statusConfirmed;
      case 'shipped': return styles.statusShipped;
      case 'delivered': return styles.statusDelivered;
      case 'cancelled': return styles.statusCancelled;
      default: return '';
    }
  };

  const getStatusText = () => {
    switch (status.toLowerCase()) {
      case 'pending': return 'Beklemede';
      case 'confirmed': return 'Onaylandı';
      case 'shipped': return 'Kargoda';
      case 'delivered': return 'Teslim Edildi';
      case 'cancelled': return 'İptal';
      default: return status;
    }
  };

  return <span className={`${styles.statusBadge} ${getStatusClass()}`}>{getStatusText()}</span>;
};

// Payment status badge component
const PaymentBadge = ({ status }: { status: string }) => {
  const getPaymentClass = () => {
    switch (status.toLowerCase()) {
      case 'paid': return styles.paymentPaid;
      case 'pending': return styles.paymentPending;
      case 'failed': return styles.paymentFailed;
      default: return '';
    }
  };

  const getPaymentText = () => {
    switch (status.toLowerCase()) {
      case 'paid': return 'Ödendi';
      case 'pending': return 'Bekliyor';
      case 'failed': return 'Başarısız';
      default: return status;
    }
  };

  return <span className={`${styles.paymentBadge} ${getPaymentClass()}`}>{getPaymentText()}</span>;
};

// Format date helper
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export default function OrdersTable({ orders, type }: OrdersTableProps) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Sipariş No</th>
            <th>Tarih</th>
            <th>{type === 'incoming' ? 'Satıcı' : 'Alıcı'}</th>
            <th>Toplam</th>
            <th>Durum</th>
            <th>Ödeme</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className={styles.orderNumber}>{order.orderNumber}</td>
              <td>{formatDate(order.orderDate)}</td>
              <td>
                {type === 'incoming'
                  ? order.sellerPharmacy?.pharmacyName || 'Bilinmiyor'
                  : order.buyerPharmacy?.pharmacyName || 'Bilinmiyor'}
              </td>
              <td className={styles.amount}>{order.totalAmount.toFixed(2)} ₺</td>
              <td>
                <StatusBadge status={order.status} />
              </td>
              <td>
                <PaymentBadge status={order.paymentStatus} />
              </td>
              <td>
                <Link href={`/siparisler/${order.id}`} className={styles.detailButton}>
                  Detay
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
