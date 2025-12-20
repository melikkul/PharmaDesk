// components/dashboard/ShipmentsCard.tsx
// TRANSFERLERİM kartı - Son 5 kargo transferi

import React from 'react';
import Link from 'next/link';
import DashboardCard from '../DashboardCard';
import tableStyles from './Table.module.css';

interface ShipmentItem {
  id: number;
  orderNumber?: string;
  productName?: string;
  trackingNumber?: string;
  status?: string;
  direction?: string; // Gelen/Giden
}

interface ShipmentsCardProps {
  data: ShipmentItem[];
  limit: number;
}

const ShipmentsCard: React.FC<ShipmentsCardProps> = ({ data, limit }) => {
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

  // Transfer numarası oluştur (TRF-ID formatında)
  const getTransferNumber = (id: number) => `TRF-${id.toString().padStart(5, '0')}`;

  return (
    <DashboardCard title="TRANSFERLERİM" viewAllLink="/transferlerim">
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>Transfer No</th>
            <th>Ürün</th>
            <th>Tür</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, limit).map(item => (
            <tr key={item.id}>
              <td>
                <Link 
                  href={`/transferlerim/${item.id}`}
                  style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}
                >
                  {getTransferNumber(item.id)}
                </Link>
              </td>
              <td>{item.productName || '-'}</td>
              <td>{getDirectionBadge(item.direction)}</td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={3} style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                Henüz transfer bulunmuyor
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </DashboardCard>
  );
};

export default ShipmentsCard;
