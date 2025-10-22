// components/profile/ProfileMedications.tsx
import React from 'react';
import DashboardCard from '../DashboardCard';
import type { MedicationItem } from '../../data/dashboardData';
import tableStyles from '../dashboard/Table.module.css'; // Dashboard'daki tablo stillerini kullanıyoruz

interface ProfileMedicationsProps {
  data: MedicationItem[];
}

const ProfileMedications: React.FC<ProfileMedicationsProps> = ({ data }) => {
  return (
    <DashboardCard title="Sistemdeki İlaçlarım" viewAllLink="#">
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>Ürün Adı</th>
            <th>Stok</th>
            <th>Son Kullanma T.</th>
            <th className={tableStyles.textRight}>Adet Fiyatı</th>
          </tr>
        </thead>
        <tbody>
          {/* Sadece ilk 5 ilacı gösterelim, "Tümünü Gör" linki ile fazlası gösterilebilir */}
          {data.slice(0, 5).map(item => (
            <tr key={item.id}>
              <td>{item.productName}</td>
              <td>{item.stock}</td>
              <td>{item.expirationDate}</td>
              <td className={`${tableStyles.textRight} ${tableStyles.fontBold}`}>
                {item.price.toFixed(2)} ₺
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DashboardCard>
  );
};

export default ProfileMedications;