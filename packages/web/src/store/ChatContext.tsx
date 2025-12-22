"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/store/AuthContext";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type ConversationType = "Direct" | "Group";

export interface Participant {
  userId: number;
  userName?: string;
  pharmacyName?: string;
  isOnline?: boolean;
}

export interface Conversation {
  id: number;
  type: ConversationType;
  groupId?: number;
  groupName?: string;
  lastMessageAt: string;
  lastMessagePreview?: string;
  unreadCount: number;
  participants: Participant[];
}

export interface Message {
  id: string | number;
  conversationId: number;
  content: string;
  senderId: string;
  senderName?: string;
  sentAt: string;
  isRead: boolean;
  isPending?: boolean; // For optimistic UI
  isFailed?: boolean;  // For failed messages
}

interface ChatContextType {
  // State
  conversations: Conversation[];
  messages: Record<number, Message[]>;
  activeConversationId: number | null;
  isLoading: boolean;
  
  // Derived state
  totalUnreadCount: number;
  
  // Online status
  onlineUsers: string[];
  
  // Typing status - Record<conversationId, array of typing users>
  typingUsers: Record<number, { userId: string; senderName: string }[]>;
  
  // Actions
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: number) => Promise<void>;
  sendMessage: (conversationId: number, content: string) => Promise<void>;
  startDirectChat: (targetUserId: number) => Promise<Conversation | null>;
  markAsRead: (conversationId: number) => Promise<void>;
  setActiveConversation: (conversationId: number | null) => void;
  sendTypingIndicator: (conversationId: number, isTyping: boolean) => void;
  markConversationAsRead: (conversationId: number) => void;
}

const ChatContext = createContext<ChatContextType>({
  conversations: [],
  messages: {},
  activeConversationId: null,
  isLoading: false,
  totalUnreadCount: 0,
  onlineUsers: [],
  typingUsers: {},
  loadConversations: async () => {},
  loadMessages: async () => {},
  sendMessage: async () => {},
  startDirectChat: async () => null,
  markAsRead: async () => {},
  setActiveConversation: () => {},
  sendTypingIndicator: () => {},
  markConversationAsRead: () => {},
});

export const useChatContext = () => useContext(ChatContext);

// ═══════════════════════════════════════════════════════════════
// ChatHub Connection
// ═══════════════════════════════════════════════════════════════

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, token, isLoading: authLoading, user } = useAuth();
  const [chatConnection, setChatConnection] = useState<any>(null);
  const [connectionState, setConnectionState] = useState<"Connected" | "Disconnected" | "Connecting">("Disconnected");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<number, Message[]>>({});
  const [activeConversationId, setActiveConversationIdState] = useState<number | null>(null);
  const activeConversationIdRef = React.useRef<number | null>(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);
  const [isLoading, setIsLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<number, { userId: string; senderName: string }[]>>({});
  
  // Track pending message IDs to prevent duplicates from own broadcasts
  const pendingMessageIds = React.useRef<Set<string>>(new Set());
  
  // Typing indicator timeout refs to clear after 3 seconds
  const typingTimeouts = React.useRef<Record<string, NodeJS.Timeout>>({});

  // ═══════════════════════════════════════════════════════════════
  // Create dedicated ChatHub connection
  // ═══════════════════════════════════════════════════════════════

  useEffect(() => {
    // Wait for auth to initialize
    if (authLoading) {
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      return;
    }

    let isMounted = true;
    let connectionInstance: { stop: () => Promise<void> } | null = null;
    const currentPharmacyId = user?.pharmacyId?.toString();

    // Dynamic import of SignalR to avoid SSR issues
    import("@microsoft/signalr").then(({ HubConnectionBuilder, LogLevel }) => {
      if (!isMounted) return;

      // Use token for Bearer auth if available, otherwise rely on cookies
      const useTokenAuth = token && token !== 'cookie-managed';

      const connection = new HubConnectionBuilder()
        .withUrl("/hubs/chat", {
          // Only provide accessTokenFactory if we have a real token
          ...(useTokenAuth ? { accessTokenFactory: () => token } : {}),
          withCredentials: true, // Always send cookies
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000, 60000])
        .configureLogging(LogLevel.Information)
        .build();

      connectionInstance = connection;

      // ═══════════════════════════════════════════════════════════════
      // REGISTER LISTENERS BEFORE STARTING CONNECTION - CRITICAL FIX
      // ═══════════════════════════════════════════════════════════════

      // 1. ReceiveMessage
      connection.on("ReceiveMessage", (msg: Message) => {
        const msgSenderId = String(msg.senderId);
        const myId = String(currentPharmacyId);
        const isOwnMessage = msgSenderId === myId;

        setMessages((prev) => {
          const convId = msg.conversationId;
          const list = prev[convId] || [];
          
          if (list.some(m => String(m.id) === String(msg.id))) return prev;
          
          if (isOwnMessage) {
            const optimisticIndex = list.findIndex(m => 
              m.content === msg.content && 
              (m.isPending === true || String(m.id).startsWith('temp-'))
            );
            
            if (optimisticIndex !== -1) {
              const updated = [...list];
              updated[optimisticIndex] = { ...msg, senderId: msgSenderId, isPending: false, isFailed: false };
              return { ...prev, [convId]: updated };
            }
            if (list.some(m => m.content === msg.content && String(m.senderId) === msgSenderId && !m.isPending)) return prev;
          }

          return { ...prev, [convId]: [...list, { ...msg, senderId: msgSenderId, isPending: false }] };
        });

        if (!isOwnMessage) {
          const isActiveConversation = activeConversationIdRef.current === msg.conversationId;
          // Double-check: Page must be visible to auto-mark as read
          const isPageVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
          
          setConversations((prev) => 
            prev.map((conv) => {
              if (conv.id === msg.conversationId) {
                return {
                  ...conv,
                  lastMessageAt: msg.sentAt,
                  lastMessagePreview: msg.content.length > 100 ? msg.content.substring(0, 100) + "..." : msg.content,
                  // Only skip unreadCount if both conditions are true
                  unreadCount: (isActiveConversation && isPageVisible) ? conv.unreadCount : conv.unreadCount + 1
                };
              }
              return conv;
            })
          );
          
          // Auto-mark as read ONLY if:
          // 1. This conversation is currently active (window is open)
          // 2. Page is visible (tab is focused)
          // 3. SignalR connection is ready
          if (isActiveConversation && isPageVisible && connection.state === "Connected") {
            connection.invoke("MarkMessagesAsRead", msg.conversationId).catch((err: Error) => {
              console.error("[ChatContext] Failed to send auto-read status:", err);
            });
          }
        }
      });

      // 2. ReceiveOnlineUsers
      connection.on("ReceiveOnlineUsers", (users: string[]) => {
        setOnlineUsers(users);
      });

      // 3. TypingIndicator
      connection.on("TypingIndicator", (data: { conversationId: number; userId: string; senderName: string; isTyping: boolean }) => {
        const key = `${data.conversationId}-${data.userId}`;
        if (typingTimeouts.current[key]) {
          clearTimeout(typingTimeouts.current[key]);
          delete typingTimeouts.current[key];
        }
        
        setTypingUsers(prev => {
          const convTypers = prev[data.conversationId] || [];
          if (data.isTyping) {
            if (!convTypers.find(t => t.userId === data.userId)) {
              typingTimeouts.current[key] = setTimeout(() => {
                setTypingUsers(p => ({
                  ...p,
                  [data.conversationId]: (p[data.conversationId] || []).filter(t => t.userId !== data.userId)
                }));
              }, 3000);
              return { ...prev, [data.conversationId]: [...convTypers, { userId: data.userId, senderName: data.senderName }] };
            }
          } else {
            return { ...prev, [data.conversationId]: convTypers.filter(t => t.userId !== data.userId) };
          }
          return prev;
        });
      });

      // 4. ReceiveReadReceipt - Enhanced read receipt with lastReadMessageId for batch update
      connection.on("ReceiveReadReceipt", (data: { 
        conversationId: number; 
        lastReadMessageId: number;
        readByUserId: string; 
        readAt: string 
      }) => {
        const myId = String(currentPharmacyId);
        
        setMessages(prev => {
          const convMessages = prev[data.conversationId];
          if (!convMessages) return prev;
          
          // Check if any updates are needed (optimization: avoid unnecessary renders)
          const hasUnreadMessages = convMessages.some(
            msg => String(msg.senderId) === myId && Number(msg.id) <= data.lastReadMessageId && !msg.isRead
          );
          
          if (!hasUnreadMessages) return prev; // Early return - no changes needed
          
          // Batch update: All my messages with id <= lastReadMessageId
          const updated = convMessages.map(msg => {
            // Early return if already read (performance optimization)
            if (msg.isRead) return msg;
            
            const msgSenderId = String(msg.senderId);
            if (msgSenderId === myId && Number(msg.id) <= data.lastReadMessageId) {
              return { ...msg, isRead: true };
            }
            return msg;
          });
          
          return { ...prev, [data.conversationId]: updated };
        });
      });

      // 5. MessageError
      connection.on("MessageError", (error: string) => {
        console.error("[ChatContext] Message error:", error);
        toast.error("Mesaj gönderilemedi");
      });

      // Start connection
      const startConnection = async () => {
        if (!isMounted) return;
        try {
          setConnectionState("Connecting");
          await connection.start();
          if (!isMounted) { await connection.stop(); return; }
          setConnectionState("Connected");
          setChatConnection(connection);
        } catch (error) {
          console.error("[ChatHub] Connection failed:", error);
          if (isMounted) setConnectionState("Disconnected");
        }
      };

      // Lifecycle handlers
      connection.onclose(() => { if (isMounted) setConnectionState("Disconnected"); });
      connection.onreconnecting(() => { if (isMounted) setConnectionState("Connecting"); });
      connection.onreconnected(() => { if (isMounted) setConnectionState("Connected"); });

      startConnection();
    });

    return () => {
      isMounted = false;
      if (connectionInstance) connectionInstance.stop();
      setChatConnection(null);
    };
  }, [isAuthenticated, authLoading, token, user]);

  // ═══════════════════════════════════════════════════════════════
  // Derived State: Total Unread Count
  // ═══════════════════════════════════════════════════════════════
  
  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
  }, [conversations]);

  // ═══════════════════════════════════════════════════════════════
  // SignalR Event Handlers
  // ═══════════════════════════════════════════════════════════════



  // ═══════════════════════════════════════════════════════════════
  // API Actions
  // ═══════════════════════════════════════════════════════════════

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return {
      'Content-Type': 'application/json',
      ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/chat/conversations', {
        credentials: 'include',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        // Map API response - convert integer type to string enum
        // Backend returns type: 0 (Direct) or 1 (Group)
        const mappedConversations = data.map((conv: Omit<Conversation, 'type'> & { type: number }) => ({
          ...conv,
          type: conv.type === 1 ? "Group" : "Direct"
        })) as Conversation[];
        setConversations(mappedConversations);
      }
    } catch (error) {
      console.error("[ChatContext] Konuşmalar yüklenemedi:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  const loadMessages = useCallback(async (conversationId: number) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        credentials: 'include',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => ({
          ...prev,
          [conversationId]: data
        }));
      }
    } catch (error) {
      console.error("[ChatContext] Mesajlar yüklenemedi:", error);
    }
  }, [getAuthHeaders]);

  const sendMessage = useCallback(async (conversationId: number, content: string) => {
    if (!content.trim()) return;

    // Use user from AuthContext
    const currentUserId = user?.pharmacyId?.toString() || "0";

    // Create optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      content: content.trim(),
      senderId: currentUserId.toString(),
      senderName: user?.pharmacyName || "Siz",
      sentAt: new Date().toISOString(),
      isRead: false,
      isPending: true
    };

    // Add optimistic message to state immediately
    setMessages(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), optimisticMessage]
    }));

    try {
      // Use SignalR ChatHub for real-time messaging if connected
      if (chatConnection?.state === "Connected") {
        await chatConnection.invoke("SendMessage", conversationId, content.trim());
        // SignalR will broadcast ReceiveMessage which replaces the optimistic message
      } else {
        // Fallback to REST API if SignalR not connected
        const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
          method: 'POST',
          credentials: 'include',
          headers: getAuthHeaders(),
          body: JSON.stringify({ content: content.trim() })
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const sentMessage = await response.json();
        
        // Replace optimistic message with confirmed one
        setMessages(prev => ({
          ...prev,
          [conversationId]: prev[conversationId]?.map(m => 
            m.id === tempId ? { ...sentMessage, isPending: false } : m
          ) || []
        }));
      }

      // Update conversation's last message preview
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              lastMessageAt: new Date().toISOString(),
              lastMessagePreview: content.length > 100 ? content.substring(0, 100) + "..." : content
            };
          }
          return conv;
        })
      );
    } catch (error) {
      console.error("[ChatContext] Mesaj gönderilemedi:", error);
      
      // Mark message as failed
      setMessages(prev => ({
        ...prev,
        [conversationId]: prev[conversationId]?.map(m => 
          m.id === tempId ? { ...m, isPending: false, isFailed: true } : m
        ) || []
      }));
      
      toast.error("Mesaj gönderilemedi");
    }
  }, [chatConnection, getAuthHeaders, user]);

  const startDirectChat = useCallback(async (targetUserId: number): Promise<Conversation | null> => {
    try {
      const response = await fetch(`/api/chat/conversations/direct/${targetUserId}`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const conversation = await response.json();
        
        // Add to conversations if not exists
        setConversations(prev => {
          if (prev.some(c => c.id === conversation.id)) {
            return prev;
          }
          return [...prev, conversation];
        });
        
        return conversation;
      }
    } catch (error) {
      console.error("[ChatContext] Sohbet başlatılamadı:", error);
      toast.error("Sohbet başlatılamadı");
    }
    return null;
  }, [getAuthHeaders]);

  const markAsRead = useCallback(async (conversationId: number) => {
    try {
      await fetch(`/api/chat/conversations/${conversationId}/read`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders()
      });

      // Update local unread count
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
        )
      );
    } catch (error) {
      console.error("[ChatContext] Okundu işareti gönderilemedi:", error);
    }
  }, [getAuthHeaders]);

  // Send typing indicator via SignalR
  const sendTypingIndicator = useCallback((conversationId: number, isTyping: boolean) => {
    if (chatConnection?.state === "Connected") {
      chatConnection.invoke("SendTypingIndicator", conversationId, isTyping).catch((err: Error) => {
        console.error("[ChatContext] Failed to send typing indicator:", err);
      });
    }
  }, [chatConnection]);

  // Mark conversation as read via SignalR (broadcasts to other participants)
  const markConversationAsRead = useCallback((conversationId: number) => {
    if (chatConnection?.state === "Connected") {
      chatConnection.invoke("MarkMessagesAsRead", conversationId).catch((err: Error) => {
        console.error("[ChatContext] Failed to mark as read via SignalR:", err);
      });
    }
  }, [chatConnection]);

  const setActiveConversation = useCallback((conversationId: number | null) => {
    setActiveConversationIdState(conversationId);
    
    // Auto-mark as read when opening a conversation
    if (conversationId !== null) {
      markAsRead(conversationId);
      // Also notify via SignalR for real-time read status
      markConversationAsRead(conversationId);
    }
  }, [markAsRead, markConversationAsRead]);

  // ═══════════════════════════════════════════════════════════════
  // Load conversations on mount
  // ═══════════════════════════════════════════════════════════════
  
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return (
    <ChatContext.Provider value={{
      conversations,
      messages,
      activeConversationId,
      isLoading,
      totalUnreadCount,
      onlineUsers,
      typingUsers,
      loadConversations,
      loadMessages,
      sendMessage,
      startDirectChat,
      markAsRead,
      setActiveConversation,
      sendTypingIndicator,
      markConversationAsRead
    }}>
      {children}
    </ChatContext.Provider>
  );
};