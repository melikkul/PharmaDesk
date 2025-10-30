// components/chat/ChatWindow.tsx

import React from 'react';
import styles from './ChatWindow.module.css';

interface Chat {
  sender: string;
  lastMessage: string;
}

interface ChatWindowProps {
  chat: Chat | null;
  onClose: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onClose }) => {
    if (!chat) return null;

    return (
        <div className={styles.chatWindow}>
            <div className={styles.chatHeader}>
                <div className={styles.chatUserInfo}>
                   <div className={styles.avatarPlaceholderSm}>{chat.sender.charAt(0)}</div>
                   <span>{chat.sender}</span>
                </div>
                <button onClick={onClose}>&times;</button>
            </div>
            <div className={styles.chatBody}>
                <div className={`${styles.message} ${styles.received}`}>{chat.lastMessage}</div>
                <div className={`${styles.message} ${styles.sent}`}>Tabii, hemen kontrol ediyorum. Sipariş numaranızı alabilir miyim?</div>
                <div className={`${styles.message} ${styles.received}`}>123-12312321</div>
            </div>
            <div className={styles.chatFooter}>
                <input type="text" placeholder="Mesajınızı yazın..." />
                <button>Gönder</button>
            </div>
        </div>
    );
};

export default ChatWindow;