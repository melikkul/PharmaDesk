// components/DashboardCard.tsx

import React from 'react';

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  viewAllLink?: string; // Opsiyonel: "Tümünü Gör" linki için
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, children, viewAllLink }) => (
    <div className="card">
        <div className="card-header">
            <h2 className="card-title">{title}</h2>
            {/* Eğer viewAllLink prop'u gönderildiyse, linki oluştur */}
            {viewAllLink && <a href={viewAllLink} className="view-all-link">Tümünü Gör</a>}
        </div>
        <div className="table-container">
            {children}
        </div>
    </div>
);

export default DashboardCard;