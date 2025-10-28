// src/components/tekliflerim/InventoryTable.tsx
import React from 'react';
import Link from 'next/link';
// GÜNCELLENDİ: Relative path yerine alias kullanıldı
import type { MedicationItem } from '@/data/dashboardData'; 
// GÜNCELLENDİ: Relative path yerine alias kullanıldı
import DashboardCard from '@/components/DashboardCard'; 
// GÜNCELLENDİ: Relative path yerine alias kullanıldı
import tableStyles from '@/components/dashboard/Table.module.css'; 
// GÜNCELLENDİ: Relative path yerine alias kullanıldı
import pageStyles from '@/app/tekliflerim/tekliflerim.module.css'; 

// İkonlar
const EditIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const DeleteIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const PauseIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>;

interface InventoryTableProps {
  data: MedicationItem[];
}

const InventoryTable: React.FC<InventoryTableProps> = ({ data }) => {
  
  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`${name} ürününü envanterden kalıcı olarak silmek istediğinizden emin misiniz?`)) {
      // Silme API çağrısı burada yapılmalı
      console.log("Siliniyor:", id);
    }
  };

  const handlePause = (id: number) => {
    // Duraklatma API çağrısı burada yapılmalı
    console.log("Duraklatılıyor:", id);
  };

  return (
    <DashboardCard title="Envanterim (Sistemdeki İlaçlarım)">
      <table className={tableStyles.table}>
        <thead>
          <tr>
            <th>Ürün Adı</th>
            <th>Stok (Adet+MF)</th>
            <th>S.K.T.</th>
            <th className={tableStyles.textRight}>Adet Fiyatı</th>
            <th>Durum</th>
            <th>Eylemler</th>
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={item.id}>
              <td>{item.productName}</td>
              <td>{item.stock}</td>
              <td>{item.expirationDate}</td>
              <td className={`${tableStyles.textRight} ${tableStyles.fontBold}`}>
                {item.price.toFixed(2)} ₺
              </td>
              <td>
                {/* Burası dinamik olabilir, örn: "Aktif", "Pasif", "Tükendi" */}
                <span className={tableStyles.textGreen}>Aktif</span>
              </td>
              <td className={pageStyles.actionCell}>
                <Link href={`/tekliflerim/${item.id}`} passHref>
                  <button className={`${pageStyles.actionButton} ${pageStyles.editButton}`} title="Düzenle">
                    <EditIcon />
                  </button>
                </Link>
                <button 
                  onClick={() => handlePause(item.id)} 
                  className={pageStyles.actionButton} 
                  title="Yayından Kaldır/Duraklat"
                >
                  <PauseIcon />
                </button>
                <button 
                  onClick={() => handleDelete(item.id, item.productName)} 
                  className={`${pageStyles.actionButton} ${pageStyles.deleteButton}`} 
                  title="Sil"
                >
                  <DeleteIcon />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DashboardCard>
  );
};

export default InventoryTable;