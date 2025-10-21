// components/dashboard/OffersCard.tsx

import React from 'react';
import DashboardCard from '../DashboardCard'; 
import type { Offer } from '../../data/dashboardData'; // Veri tipini import ediyoruz

interface OffersCardProps {
  data: Offer[];
  limit: number; // YENİ: Limit prop'u eklendi
}

const OffersCard: React.FC<OffersCardProps> = ({ data, limit }) => {
  return (
    <DashboardCard title="TEKLİFLERİM">
      <table>
        <thead>
          <tr>
            <th>Ürün Görseli</th>
            <th>Ürün Adı</th>
            <th>Stok</th>
            <th>Adet Fiyatı</th>
          </tr>
        </thead>
        <tbody>
          {/* YENİ: Veri map'lenmeden önce slice ile limitleniyor */}
          {data.slice(0, limit).map(item => (
            <tr key={item.id}>
              <td><div className="product-image-placeholder"></div></td>
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