"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useSignalR } from "@/store/SignalRContext";

export interface Message {
  id: string | number;
  content: string;
  senderId: string;
  sentAt: string;
  isRead: boolean;
}

interface ChatContextType {
  messages: Record<string, Message[]>;
  sendMessage: (receiverId: string, content: string) => Promise<void>;
  loadMessages: (otherUserId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType>({
  messages: {},
  sendMessage: async () => { },
  loadMessages: async () => { },
});

export const useChatContext = () => useContext(ChatContext);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { connection } = useSignalR();
  const [messages, setMessages] = useState<Record<string, Message[]>>({});

  useEffect(() => {
    if (!connection) return;

    connection.on("ReceiveMessage", (msg: Message) => {
      console.log("Mesaj alındı:", msg);

      setMessages((prev) => {
        const partnerId = msg.senderId;

        const list = prev[partnerId] || [];
        if (list.some(m => m.id === msg.id)) return prev;

        return { ...prev, [partnerId]: [...list, msg] };
      });
    });

    return () => {
      connection.off("ReceiveMessage");
    };
  }, [connection]);

  const sendMessage = async (receiverId: string, content: string) => {
    if (!connection) return;
    try {
      await connection.invoke("SendMessage", receiverId, content);
    } catch (err) {
      console.error("Mesaj hatası:", err);
    }
  };

  const loadMessages = async (otherUserId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${''}/api/Messages/${otherUserId}`, {
        credentials: 'include',
        headers: {
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => ({
          ...prev,
          [otherUserId]: data
        }));
      }
    } catch (error) {
      console.error("Geçmiş mesajlar yüklenemedi:", error);
    }
  };

  return (
    <ChatContext.Provider value={{ messages, sendMessage, loadMessages }}>
      {children}
    </ChatContext.Provider>
  );
};