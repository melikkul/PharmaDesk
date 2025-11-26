// components/notifications/NotificationItem.tsx
import React from 'react';
import { NotificationIcon, ShipmentIcon } from '../ui/Icons';
import styles from './NotificationItem.module.css';

// --- HATA DÜZELTME: YEREL ARAYÜZ SİLİNDİ ---
// interface Notification {
//   id: number;
//   read: boolean;
//   type: string; // <-- Hatanın kaynağı buydu
//   title: string;
//   message: string;
// }
// --- ---

// YENİ: Doğru tip 'dashboardData'dan import edildi
import { Notification } from '@/types';

interface NotificationItemProps {
  item: Notification;
  onClick: (item: Notification) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ item, onClick }) => {
    const getIcon = (type: string) => {
        switch (type) {
            case 'shipment': return <ShipmentIcon />;
            case 'balance': return <NotificationIcon />;
            default: return <NotificationIcon />;
        }
    };

    return (
        <div className={`${styles.panelItem} ${!item.isRead ? styles.unread : ''}`} onClick={() => onClick(item)}>
            {getIcon(item.type)}
            <div className={styles.itemContent}>
                <strong>{item.type}</strong>
                <p>{item.message}</p>
            </div>
            {!item.isRead && <div className={styles.unreadDot}></div>}
        </div>
    );
};

export default NotificationItem;