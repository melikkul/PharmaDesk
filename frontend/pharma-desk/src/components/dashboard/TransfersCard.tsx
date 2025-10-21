// components/dashboard/TransfersCard.tsx

import React from 'react';
import DashboardCard from '../DashboardCard';
import type { TransferItem } from '../../data/dashboardData';

interface TransfersCardProps {
  data: TransferItem[];
  limit: number; // YENİ
}

const TransfersCard: React.FC<TransfersCardProps> = ({ data, limit }) => {
  return (
    <DashboardCard title="TRANSFERLERİM">
      <table>
        <thead>
          <tr>
            <th>Sipariş Numarası</th>
            <th>Ürün Adı</th>
            <th className='text-right'>Sipariş Tutarı</th>
          </tr>
        </thead>
        <tbody>
          {/* YENİ: slice() eklendi */}
          {data.slice(0, limit).map(item => (
            <tr key={item.id}>
              <td>{item.orderNumber}</td>
              <td>{item.productName}</td>
              <td className="text-right">{item.amount.toFixed(2)} ₺</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DashboardCard>
  );
};

export default TransfersCard;