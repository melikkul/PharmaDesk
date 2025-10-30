// components/dashboard/TransfersCard.tsx

import React from 'react';
import DashboardCard from '../DashboardCard';
import type { TransferItem } from '../../data/dashboardData';
import tableStyles from './Table.module.css';

interface TransfersCardProps {
  data: TransferItem[];
  limit: number;
}

const TransfersCard: React.FC<TransfersCardProps> = ({ data, limit }) => {
  return (
    <DashboardCard title="TRANSFERLERİM">
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>Sipariş Numarası</th>
            <th>Ürün Adı</th>
            <th className={tableStyles.textRight}>Sipariş Tutarı</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, limit).map(item => (
            <tr key={item.id}>
              <td>{item.orderNumber}</td>
              <td>{item.productName}</td>
              <td className={tableStyles.textRight}>{item.amount.toFixed(2)} ₺</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DashboardCard>
  );
};

export default TransfersCard;

