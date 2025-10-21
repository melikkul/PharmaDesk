// components/notifications/NotificationItem.tsx

import React from 'react';
import { NotificationIcon, ShipmentIcon } from '../ui/Icons'; // İkonları import ediyoruz

interface Notification {
  id: number;
  read: boolean;
  type: string;
  title: string;
  message: string;
}

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
        <div className={`panel-item ${!item.read ? 'unread' : ''}`} onClick={() => onClick(item)}>
            {getIcon(item.type)}
            <div className="item-content">
                <strong>{item.title}</strong>
                <p>{item.message}</p>
            </div>
            {!item.read && <div className="unread-dot"></div>}
        </div>
    );
};

export default NotificationItem;