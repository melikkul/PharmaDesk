// components/dashboard/ShipmentsCard.tsx

import React from 'react';
import DashboardCard from '../DashboardCard';
import type { ShipmentItem } from '../../data/dashboardData';

interface ShipmentsCardProps {
  data: ShipmentItem[];
  limit: number; // YENİ
}

const ShipmentsCard: React.FC<ShipmentsCardProps> = ({ data, limit }) => {
  return (
    <DashboardCard title="KARGOLARIM">
      <table>
        <thead>
          <tr>
            <th>Sipariş Numarası</th>
            <th>Ürün Adı</th>
            <th>Kargo Numarası</th>
          </tr>
        </thead>
        <tbody>
          {/* YENİ: slice() eklendi */}
          {data.slice(0, limit).map(item => (
            <tr key={item.id}>
              <td>{item.orderNumber}</td>
              <td>{item.productName}</td>
              <td>{item.trackingNumber} <i className="fa-solid fa-copy copy-icon"></i></td>
            </tr>
          ))}
        </tbody>
      </table>
    </DashboardCard>
  );
};

export default ShipmentsCard;