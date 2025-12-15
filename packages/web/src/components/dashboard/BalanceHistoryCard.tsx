// components/dashboard/BalanceHistoryCard.tsx

import React from 'react';
import Link from 'next/link';
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
            <th>İlaç Adı</th>
            <th className={tableStyles.textRight}>Ödeme Miktarı</th>
          </tr>
        </thead>
        <tbody>
          {data
            .filter(item => item.amount !== 0) // Bakiyesi 0 olanları gösterme
            .slice(0, limit)
            .map((item, index) => (
             <tr key={item.id ?? `balance-${index}`}>
                <td>{item.date}</td>
                <td>
                  {item.medicationId ? (
                    <Link 
                      href={`/ilaclar/${item.medicationId}`}
                      style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}
                    >
                      {item.productName || item.description}
                    </Link>
                  ) : (
                    item.productName || item.description
                  )}
                </td>
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
