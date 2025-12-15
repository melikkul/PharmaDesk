// components/dashboard/OffersCard.tsx

import React from 'react';
import Link from 'next/link';
import DashboardCard from '../DashboardCard'; 
import type { Offer } from '../../lib/dashboardData';
import tableStyles from './Table.module.css';

interface OfferWithImage extends Offer {
  imageUrl?: string;
  medicationId?: number;
  type?: string;
  malFazlasi?: string;
}

interface OffersCardProps {
  data: OfferWithImage[];
  limit: number;
}

const OffersCard: React.FC<OffersCardProps> = ({ data, limit }) => {
  const apiBaseUrl = '';
  
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
              <td>
                <Link 
                  href={`/ilaclar/${item.medicationId || item.id}?barem=${encodeURIComponent(item.malFazlasi || '1+0')}&type=${(item.type || 'stocksale').toLowerCase()}&offerId=${item.id}`}
                  className="text-gray-900 hover:text-blue-600 hover:underline transition-colors"
                >
                  {item.productName}
                </Link>
              </td>
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
