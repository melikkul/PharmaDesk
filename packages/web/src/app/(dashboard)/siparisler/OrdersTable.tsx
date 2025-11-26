// src/app/(dashboard)/siparisler/OrdersTable.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Order } from '@/types';
import { PriceDisplay, StatusBadge, DateDisplay } from '@/components/common';
import styles from './siparisler.module.css';

interface OrdersTableProps {
  orders: Order[];
  type: 'incoming' | 'outgoing';
}

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
              <td>
                <DateDisplay date={order.orderDate} format="date" />
              </td>
              <td>
                {type === 'incoming'
                  ? order.sellerPharmacy?.pharmacyName || 'Bilinmiyor'
                  : order.buyerPharmacy?.pharmacyName || 'Bilinmiyor'}
              </td>
              <td className={styles.amount}>
                <PriceDisplay amount={order.totalAmount} />
              </td>
              <td>
                <StatusBadge status={order.status} type="order" />
              </td>
              <td>
                <StatusBadge status={order.paymentStatus} type="payment" />
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
