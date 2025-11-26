// components/dashboard/OffersCard.tsx

import React from 'react';
import DashboardCard from '../DashboardCard'; 
import type { Offer } from '../../lib/dashboardData';
import tableStyles from './Table.module.css';

interface OffersCardProps {
  data: Offer[];
  limit: number;
}

const OffersCard: React.FC<OffersCardProps> = ({ data, limit }) => {
  return (
    <DashboardCard title="TEKLİFLERİM">
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>Ürün Görseli</th>
            <th>Ürün Adı</th>
            <th>Stok</th>
            <th>Adet Fiyatı</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, limit).map(item => (
            <tr key={item.id}>
              <td><div className={tableStyles.productImagePlaceholder}></div></td>
              <td>{item.productName}</td>
              <td>{item.stock}</td>
              <td>{item.price.toFixed(2)} ₺</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DashboardCard>
  );
};

export default OffersCard;

