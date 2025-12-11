// src/components/features/orders/OrdersList.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { Order } from '@/types';
import { PriceDisplay, StatusBadge, DateDisplay } from '@/components/common';
import { Button } from '@/components/ui';
import styles from './orders.module.css';

interface OrdersListProps {
  orders: Order[];
  type: 'incoming' | 'outgoing';
}

const OrdersList: React.FC<OrdersListProps> = ({ orders, type }) => {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Sipariş No</th>
            <th>Tarih</th>
            <th>{type === 'incoming' ? 'Satıcı' : 'Alıcı'}</th>
            <th>Toplam</th>
            {type === 'incoming' && <th>Kar</th>}
            <th>Durum</th>
            <th>Ödeme</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            // Calculate total profit from order items (only for incoming)
            const orderProfit = type === 'incoming' 
              ? order.orderItems?.reduce((sum, item) => sum + (item.profitAmount || 0), 0) || 0
              : 0;
            
            return (
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
              {type === 'incoming' && (
                <td className={styles.amount} style={{ color: orderProfit > 0 ? '#16a34a' : 'inherit' }}>
                  {orderProfit > 0 ? `+${orderProfit.toFixed(2)} ₺` : '-'}
                </td>
              )}
              <td>
                <StatusBadge status={order.status} type="order" />
              </td>
              <td>
                <StatusBadge status={order.paymentStatus} type="payment" />
              </td>
              <td>
                <Link href={`/siparisler/${order.id}`}>
                  <Button variant="secondary" size="small">
                    Detay
                  </Button>
                </Link>
              </td>
            </tr>
          )})}
        </tbody>
      </table>
    </div>
  );
};

export default OrdersList;
