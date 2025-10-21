// components/dashboard/BalanceHistoryCard.tsx

import React from 'react';
import DashboardCard from '../DashboardCard';
import type { BalanceItem } from '../../data/dashboardData';

interface BalanceHistoryCardProps {
  data: BalanceItem[];
  limit: number; // YENİ
}

const BalanceHistoryCard: React.FC<BalanceHistoryCardProps> = ({ data, limit }) => {
  return (
    <DashboardCard title="BAKİYE GEÇMİŞİ">
      <table>
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Açıklama</th>
            <th className='text-right'>Ödeme Miktarı</th>
          </tr>
        </thead>
        <tbody>
          {/* YENİ: slice() eklendi */}
          {data.slice(0, limit).map(item => (
             <tr key={item.id}>
                <td>{item.date}</td>
                <td>{item.description}</td>
                <td className={`text-right font-bold ${item.type === 'positive' ? 'text-green' : 'text-red'}`}>
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