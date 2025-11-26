// components/notifications/MessageItem.tsx
import React from 'react';
import styles from './MessageItem.module.css';

// YENİ: Doğru tip 'dashboardData'dan import edildi
import type { Message } from '@/lib/dashboardData'; 

// --- HATA DÜZELTME: YEREL ARAYÜZ SİLİNDİ ---
// interface Message {
//   id: number;
//   sender: string;
//   lastMessage: string;
//   read: boolean;
// }
// --- ---

interface MessageItemProps {
  item: Message;
  onClick: (item: Message) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({ item, onClick }) => (
    <div className={`${styles.panelItem} ${!item.read ? styles.unread : ''}`} onClick={() => onClick(item)}>
        <div className={styles.itemIconWrapper}>
             {/* YENİ: Avatarı veya baş harfi göster */}
             {item.avatar ? (
                <img src={item.avatar} alt={item.sender} className={styles.avatarPlaceholderSm} />
             ) : (
                <div className={styles.avatarPlaceholderSm}>{item.sender.charAt(0)}</div>
             )}
        </div>
        <div className={styles.itemContent}>
            <strong>{item.sender}</strong>
            <p>{item.lastMessage}</p>
        </div>
        {!item.read && <div className={styles.unreadDot}></div>}
    </div>
);

export default MessageItem;