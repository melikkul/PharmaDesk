// components/notifications/MessageItem.tsx

import React from 'react';

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
    <div className={`panel-item ${!item.read ? 'unread' : ''}`} onClick={() => onClick(item)}>
        <div className="item-icon-wrapper">
             <div className="avatar-placeholder-sm">{item.sender.charAt(0)}</div>
        </div>
        <div className="item-content">
            <strong>{item.sender}</strong>
            <p>{item.lastMessage}</p>
        </div>
        {!item.read && <div className="unread-dot"></div>}
    </div>
);

export default MessageItem;