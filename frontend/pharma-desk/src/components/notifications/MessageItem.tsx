// components/notifications/MessageItem.tsx

import React from 'react';
import styles from './MessageItem.module.css';

interface Message {
  id: number;
  sender: string;
  lastMessage: string;
  read: boolean;
}

interface MessageItemProps {
  item: Message;
  onClick: (item: Message) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ item, onClick }) => (
    <div className={`${styles.panelItem} ${!item.read ? styles.unread : ''}`} onClick={() => onClick(item)}>
        <div className={styles.itemIconWrapper}>
             <div className={styles.avatarPlaceholderSm}>{item.sender.charAt(0)}</div>
        </div>
        <div className={styles.itemContent}>
            <strong>{item.sender}</strong>
            <p>{item.lastMessage}</p>
        </div>
        {!item.read && <div className={styles.unreadDot}></div>}
    </div>
);

export default MessageItem;