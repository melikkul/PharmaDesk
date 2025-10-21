// components/notifications/NotificationModal.tsx

import React from 'react';

interface Notification {
  title: string;
  message: string;
}

interface NotificationModalProps {
  notification: Notification | null;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ notification, onClose }) => {
    if (!notification) return null;

    return (
        <div className="modal-overlay show" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>&times;</button>
                <h2>{notification.title}</h2>
                <p>{notification.message}</p>
                <p>Bu, bildirimin detaylı içeriğidir. Burada daha fazla bilgi yer alabilir.</p>
            </div>
        </div>
    );
};

export default NotificationModal;