// src/components/raporlar/ReportCard.tsx
import React from 'react';
import Link from 'next/link';
import styles from './ReportCard.module.css';

// Basit SVG ikonları
const SalesIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22m-6-6l6 6 6-6"/></svg>;
const PurchaseIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22m-6-18l6 6 6-6"/></svg>;
const AccountIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>;
const InventoryIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const ExpiryIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/><path d="M12 2a4 4 0 0 0-4 4v0a4 4 0 0 0 4 4Z"/></svg>;
const PerformanceIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>;
const DemandIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>;
const BalanceIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-3.5c2-1.5 2-2.7 2-4.5 0-5.3-7.5-6.5-11-5-0.2-0.6-0.5-2-3-2Z"/><path d="M12 10v4Z"/></svg>;


const getIcon = (icon: string) => {
    switch (icon) {
        case 'sales': return <SalesIcon />;
        case 'purchase': return <PurchaseIcon />;
        case 'account': return <AccountIcon />;
        case 'inventory': return <InventoryIcon />;
        case 'expiry': return <ExpiryIcon />;
        case 'performance': return <PerformanceIcon />;
        case 'demand': return <DemandIcon />;
        case 'balance': return <BalanceIcon />;
        default: return <AccountIcon />;
    }
};

interface ReportCardProps {
  title: string;
  description: string;
  icon: string;
  link: string;
}

const ReportCard: React.FC<ReportCardProps> = ({ title, description, icon, link }) => {
  return (
    <Link href={link} className={styles.reportCard}>
      <div className={styles.cardIcon}>
        {getIcon(icon)}
      </div>
      <div className={styles.cardContent}>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className={styles.cardArrow}>
        &rarr;
      </div>
    </Link>
  );
};

export default ReportCard;