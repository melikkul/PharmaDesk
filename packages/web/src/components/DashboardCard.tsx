// components/DashboardCard.tsx

import React from 'react';
import styles from './DashboardCard.module.css';

interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  viewAllLink?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, children, viewAllLink }) => (
    <div className={styles.card}>
        <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>{title}</h2>
            {viewAllLink && <a href={viewAllLink} className={styles.viewAllLink}>Tümünü Gör</a>}
        </div>
        <div className={styles.tableContainer}>
            {children}
        </div>
    </div>
);

export default DashboardCard;