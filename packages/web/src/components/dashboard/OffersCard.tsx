// components/dashboard/OffersCard.tsx

import React from 'react';
import DashboardCard from '../DashboardCard'; 
import type { Offer } from '../../lib/dashboardData';
import tableStyles from './Table.module.css';

interface OfferWithImage extends Offer {
  imageUrl?: string;
}

interface OffersCardProps {
  data: OfferWithImage[];
  limit: number;
}

const OffersCard: React.FC<OffersCardProps> = ({ data, limit }) => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
  
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
              <td>
                <img 
                  src={item.imageUrl?.startsWith('/images/') 
                    ? `${apiBaseUrl}${item.imageUrl}` 
                    : (item.imageUrl || '/logoYesil.png')}
                  alt={item.productName}
                  className={tableStyles.productImage}
                  onError={(e) => { e.currentTarget.src = '/logoYesil.png'; }}
                />
              </td>
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

