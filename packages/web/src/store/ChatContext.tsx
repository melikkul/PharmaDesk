"use client";

import React, { createContext, useContext } from "react";
import { useMockChat } from "@/store/MockChatContext";

export interface Message {
  id: string;
  content: string;
  senderId: number;
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
  sendMessage: async () => {},
  loadMessages: async () => {},
});

export const useChatContext = () => useContext(ChatContext);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { messages, sendMessage, markAsRead } = useMockChat();

  // loadMessages is now a no-op since we use mock data
  const loadMessages = async (otherUserId: string) => {
    // Mock data is already loaded, just mark as read
    markAsRead(otherUserId);
  };

  return (
    <ChatContext.Provider value={{ messages, sendMessage, loadMessages }}>
      {children}
    </ChatContext.Provider>
  );
};
