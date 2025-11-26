// components/dashboard/BalanceHistoryCard.tsx

import React from 'react';
import DashboardCard from '../DashboardCard';
import type { BalanceItem } from '../../lib/dashboardData';
import tableStyles from './Table.module.css';

interface BalanceHistoryCardProps {
  data: BalanceItem[];
  limit: number;
}

const BalanceHistoryCard: React.FC<BalanceHistoryCardProps> = ({ data, limit }) => {
  return (
    <DashboardCard title="BAKİYE GEÇMİŞİ">
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Açıklama</th>
            <th className={tableStyles.textRight}>Ödeme Miktarı</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, limit).map(item => (
             <tr key={item.id}>
                <td>{item.date}</td>
                <td>{item.description}</td>
                <td className={`${tableStyles.textRight} ${tableStyles.fontBold} ${item.type === 'positive' ? tableStyles.textGreen : tableStyles.textRed}`}>
                   {item.type === 'positive' ? '+' : ''}{item.amount.toFixed(2)} ₺
                </td>
             </tr>
          ))}
        </tbody>
      </table>
    </DashboardCard>
  );
};

export default BalanceHistoryCard;

