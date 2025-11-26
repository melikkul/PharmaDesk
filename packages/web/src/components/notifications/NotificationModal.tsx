// components/notifications/NotificationModal.tsx

import React from 'react';
import styles from './NotificationModal.module.css';

import { Notification } from '@/types';

interface NotificationModalProps {
  notification: Notification | null;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ notification, onClose }) => {
    if (!notification) return null;

    return (
        <div className={`${styles.modalOverlay} ${styles.show}`} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <button className={styles.modalClose} onClick={onClose}>&times;</button>
                <h2>{notification.type || 'Bildirim'}</h2>
                <p>{notification.message}</p>
                <p>Bu, bildirimin detaylı içeriğidir. Burada daha fazla bilgi yer alabilir.</p>
            </div>
        </div>
    );
};

export default NotificationModal;