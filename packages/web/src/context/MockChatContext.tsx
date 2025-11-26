"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface Message {
  id: string;
  content: string;
  senderId: number;
  sentAt: string;
  isRead: boolean;
}

interface PharmacyProfile {
  id: string;
  pharmacyName: string;
  profileImagePath?: string;
  city?: string;
  username?: string;
}

interface MockChatContextType {
  users: PharmacyProfile[];
  messages: Record<string, Message[]>;
  sendMessage: (receiverId: string, content: string) => Promise<void>;
  onlineUsers: Set<string>;
  markAsRead: (conversationId: string) => void;
}

const MockChatContext = createContext<MockChatContextType>({
  users: [],
  messages: {},
  sendMessage: async () => {},
  onlineUsers: new Set(),
  markAsRead: () => {},
});

export const useMockChat = () => useContext(MockChatContext);

// Mock pharmacy users
const MOCK_USERS: PharmacyProfile[] = [
  {
    id: "3",
    pharmacyName: "Sağlık Eczanesi",
    city: "İstanbul",
    username: "saglik_eczane"
  },
  {
    id: "4",
    pharmacyName: "Merkez Eczanesi",
    city: "Ankara",
    username: "merkez_eczane"
  },
  {
    id: "5",
    pharmacyName: "Yıldız Eczanesi",
    city: "İzmir",
    username: "yildiz_eczane"
  },
  {
    id: "6",
    pharmacyName: "Güneş Eczanesi",
    city: "Bursa",
    username: "gunes_eczane"
  },
  {
    id: "7",
    pharmacyName: "Doğa Eczanesi",
    city: "Antalya",
    username: "doga_eczane"
  }
];

// Mock initial messages
const INITIAL_MESSAGES: Record<string, Message[]> = {
  "3": [
    {
      id: "msg-1",
      content: "Merhaba, Dolorex için teklifiniz var mı?",
      senderId: 3,
      sentAt: new Date(Date.now() - 3600000).toISOString(),
      isRead: true
    },
    {
      id: "msg-2",
      content: "Evet, 500 kutuluk stoğumuz mevcut. Fiyat konuşabiliriz.",
      senderId: 2,
      sentAt: new Date(Date.now() - 3000000).toISOString(),
      isRead: true
    },
    {
      id: "msg-3",
      content: "Harika! En iyi fiyatınız nedir?",
      senderId: 3,
      sentAt: new Date(Date.now() - 2400000).toISOString(),
      isRead: true
    }
  ],
  "4": [
    {
      id: "msg-4",
      content: "İyi günler, toplu ilaç siparişi için görüşelim mi?",
      senderId: 4,
      sentAt: new Date(Date.now() - 7200000).toISOString(),
      isRead: true
    }
  ],
  "5": [
    {
      id: "msg-5",
      content: "Benical stokları için bilgi alabilir miyim?",
      senderId: 5,
      sentAt: new Date(Date.now() - 10800000).toISOString(),
      isRead: false
    }
  ]
};

// Auto-reply templates
const AUTO_REPLY_TEMPLATES = [
  "Mesajınız için teşekkürler! En kısa sürede size dönüş yapacağım.",
  "İlginiz için teşekkür ederim. Detaylı bilgi için size ulaşacağım.",
  "Merhaba! Talebinizi aldım, en yakın zamanda yanıt vereceğim.",
  "Teşekkürler! Bu konuyla ilgileniyorum, kısa süre içinde size döneceğim.",
  "Mesajınızı aldım, fiyat ve stok bilgisi için size dönüş yapacağım."
];

export const MockChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [messages, setMessages] = useState<Record<string, Message[]>>(INITIAL_MESSAGES);
  const [onlineUsers] = useState<Set<string>>(new Set(["3", "4", "6"])); // Some users are "online"

  const sendMessage = useCallback(async (receiverId: string, content: string) => {
    if (!content.trim()) return;

    const myId = 2; // Current user is PharmacyId=2 (melik_kul@outlook.com)
    const tempId = `msg-${Date.now()}`;
    
    // Create outgoing message
    const newMessage: Message = {
      id: tempId,
      content: content.trim(),
      senderId: myId,
      sentAt: new Date().toISOString(),
      isRead: false
    };

    // Add message to conversation
    setMessages(prev => ({
      ...prev,
      [receiverId]: [...(prev[receiverId] || []), newMessage]
    }));

    // Simulate auto-reply after 1-2 seconds (random delay for realism)
    const delay = 1000 + Math.random() * 1000;
    setTimeout(() => {
      const autoReplyId = `msg-auto-${Date.now()}`;
      const randomReply = AUTO_REPLY_TEMPLATES[Math.floor(Math.random() * AUTO_REPLY_TEMPLATES.length)];
      
      const autoReplyMessage: Message = {
        id: autoReplyId,
        content: randomReply,
        senderId: Number(receiverId),
        sentAt: new Date().toISOString(),
        isRead: false
      };

      setMessages(prev => ({
        ...prev,
        [receiverId]: [...(prev[receiverId] || []), autoReplyMessage]
      }));
    }, delay);

  }, []);

  const markAsRead = useCallback((conversationId: string) => {
    setMessages(prev => {
      const conversationMessages = prev[conversationId] || [];
      const updatedMessages = conversationMessages.map(msg => ({
        ...msg,
        isRead: true
      }));
      
      return {
        ...prev,
        [conversationId]: updatedMessages
      };
    });
  }, []);

  return (
    <MockChatContext.Provider value={{ 
      users: MOCK_USERS, 
      messages, 
      sendMessage, 
      onlineUsers,
      markAsRead
    }}>
      {children}
    </MockChatContext.Provider>
  );
};
