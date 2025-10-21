// components/chat/ChatWindow.tsx

import React from 'react';

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
        <div className="chat-window">
            <div className="chat-header">
                <div className="chat-user-info">
                   <div className="avatar-placeholder-sm">{chat.sender.charAt(0)}</div>
                   <span>{chat.sender}</span>
                </div>
                <button onClick={onClose}>&times;</button>
            </div>
            <div className="chat-body">
                <div className="message received">{chat.lastMessage}</div>
                <div className="message sent">Tabii, hemen kontrol ediyorum. Sipariş numaranızı alabilir miyim?</div>
                <div className="message received">123-12312321</div>
            </div>
            <div className="chat-footer">
                <input type="text" placeholder="Mesajınızı yazın..." />
                <button>Gönder</button>
            </div>
        </div>
    );
};

export default ChatWindow;