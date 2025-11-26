'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import { orderService } from '@/services/orderService';
import { Order } from '@/types';
import styles from './orderDetail.module.css';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };
  const { token } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchOrderDetail();
  }, [token, id]);

  const fetchOrderDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!token) throw new Error('Token not found');
      const data = await orderService.getOrderById(token, id);
      setOrder(data);
    } catch (err) {
      console.error('Order detail fetch error:', err);
      setError('Sipariş detayı yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Yükleniyor...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error || 'Sipariş bulunamadı'}</div>
        <button onClick={() => router.back()} className={styles.backButton}>
          Geri Dön
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Siparişlere Dön
        </button>
        <h1>Sipariş Detayı</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          <h2>Sipariş Bilgileri</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.label}>Sipariş No:</span>
              <span className={styles.value}>{order.orderNumber}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Tarih:</span>
              <span className={styles.value}>
                {new Date(order.orderDate).toLocaleString('tr-TR')}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Durum:</span>
              <span className={`${styles.value} ${styles.status}`}>
                {order.status}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.label}>Ödeme Durumu:</span>
              <span className={styles.value}>{order.paymentStatus}</span>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h2>Taraflar</h2>
          <div className={styles.partiesGrid}>
            <div className={styles.party}>
              <h3>Alıcı Eczane</h3>
              <p>{order.buyerPharmacy?.pharmacyName || 'Bilinmiyor'}</p>
            </div>
            <div className={styles.party}>
              <h3>Satıcı Eczane</h3>
              <p>{order.sellerPharmacy?.pharmacyName || 'Bilinmiyor'}</p>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <h2>Sipariş Ürünleri</h2>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Miktar</th>
                <th>Birim Fiyat</th>
                <th>MF</th>
                <th>Toplam</th>
              </tr>
            </thead>
            <tbody>
              {order.orderItems?.map((item, index) => (
                <tr key={item.id || index}>
                  <td>{item.medication?.name || 'Ürün'}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unitPrice.toFixed(2).replace('.', ',')} ₺</td>
                  <td>{item.bonusQuantity || 0}</td>
                  <td>{(item.quantity * item.unitPrice).toFixed(2).replace('.', ',')} ₺</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className={styles.totalLabel}>Genel Toplam</td>
                <td className={styles.totalValue}>
                  {order.totalAmount.toFixed(2).replace('.', ',')} ₺
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
