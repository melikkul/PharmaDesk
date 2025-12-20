// components/dashboard/TransfersCard.tsx
// SİPARİŞLERİM kartı - Son 5 sipariş (Gelen + Giden karışık)

import React from 'react';
import Link from 'next/link';
import DashboardCard from '../DashboardCard';
import tableStyles from './Table.module.css';

interface OrderItem {
  id: number;
  orderNumber?: string;
  productName?: string;
  totalAmount?: number;
  status?: string;
  direction?: string; // Gelen/Giden
}

interface TransfersCardProps {
  data: OrderItem[];
  limit: number;
}

const TransfersCard: React.FC<TransfersCardProps> = ({ data, limit }) => {
  const getDirectionBadge = (direction?: string) => {
    if (direction === 'Giden') {
      return <span style={{ 
        background: 'rgba(231, 76, 60, 0.1)', 
        color: '#e74c3c', 
        padding: '2px 8px', 
        borderRadius: '4px', 
        fontWeight: 500,
        fontSize: '12px'
      }}>↑ Giden</span>;
    }
    return <span style={{ 
      background: 'rgba(39, 174, 96, 0.1)', 
      color: '#27ae60', 
      padding: '2px 8px', 
      borderRadius: '4px', 
      fontWeight: 500,
      fontSize: '12px'
    }}>↓ Gelen</span>;
  };

  const formatAmount = (amount?: number, direction?: string) => {
    if (!amount) return '-';
    const formatted = amount.toFixed(2);
    // Giden siparişlerde tutar pozitif (satış geliri), Gelen siparişlerde negatif (ödeme)
    if (direction === 'Giden') {
      return <span style={{ color: '#27ae60', fontWeight: 600 }}>+{formatted} ₺</span>;
    }
    return <span style={{ color: '#e74c3c', fontWeight: 600 }}>-{formatted} ₺</span>;
  };

  return (
    <DashboardCard title="SİPARİŞLERİM" viewAllLink="/siparisler">
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>Sipariş No</th>
            <th>Ürün</th>
            <th>Tür</th>
            <th className={tableStyles.textRight}>Tutar</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, limit).map(item => (
            <tr key={item.id}>
              <td>
                <Link 
                  href={`/siparisler/${item.id}`}
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                >
                  {item.orderNumber || `SİP-${item.id}`}
                </Link>
              </td>
              <td>{item.productName || '-'}</td>
              <td>{getDirectionBadge(item.direction)}</td>
              <td className={tableStyles.textRight}>
                {formatAmount(item.totalAmount, item.direction)}
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                Henüz sipariş bulunmuyor
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </DashboardCard>
  );
};

export default TransfersCard;
