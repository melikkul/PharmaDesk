"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useChatContext, Message, Conversation } from "@/store/ChatContext";
import { useAuth } from "@/store/AuthContext";
import { Users, Send, Loader2 } from "lucide-react";

interface ChatWindowProps {
  conversationId: number | null;
  onMinimize?: () => void;
  onClose?: () => void;
  isMinimized?: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  conversationId, 
  onMinimize, 
  onClose, 
  isMinimized = false 
}) => {
  // Use onlineUsers from ChatContext (connected to ChatHub) instead of SignalRContext (NotificationHub)
  const { 
    messages, 
    conversations, 
    sendMessage, 
    loadMessages,
    typingUsers,
    sendTypingIndicator,
    markConversationAsRead,
    setActiveConversation,
    onlineUsers
  } = useChatContext();
  const { user } = useAuth();

  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MY_USER_ID = user?.pharmacyId ? String(user.pharmacyId) : "0";
  
  // Get current conversation
  const conversation = conversations.find(c => c.id === conversationId);
  const conversationMessages = conversationId ? (messages[conversationId] || []) : [];
  
  // Get typing users for this conversation (excluding self)
  const currentTypingUsers = conversationId 
    ? (typingUsers[conversationId] || []).filter(t => t.userId !== MY_USER_ID)
    : [];
  
  // Check if any participant is online (for direct chats)
  // onlineUsers is an array from ChatContext, use includes()
  const otherParticipant = conversation?.participants.find(p => 
    p.userId.toString() !== MY_USER_ID
  );
  const isOtherUserOnline = otherParticipant 
    ? onlineUsers.includes(otherParticipant.userId.toString()) 
    : false;

  // Get conversation title
  const getTitle = () => {
    if (!conversation) return "Yükleniyor...";
    if (conversation.type === "Group") {
      return conversation.groupName || "Grup Sohbeti";
    }
    return otherParticipant?.pharmacyName || "Bilinmeyen Eczane";
  };

  // ═══════════════════════════════════════════════════════════════
  // Smart Read Trigger System with Page Visibility API
  // ═══════════════════════════════════════════════════════════════
  
  // Debounced mark as read function (300ms delay to prevent spam)
  const triggerMarkAsRead = useCallback(() => {
    if (!conversationId) return;
    
    // Critical: Only mark as read if page is visible (tab is active)
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
      return;
    }
    
    // Clear any pending timeout
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
    }
    
    // Debounce: Wait 300ms before sending
    markAsReadTimeoutRef.current = setTimeout(() => {
      markConversationAsRead(conversationId);
    }, 300);
  }, [conversationId, markConversationAsRead]);
  
  // Trigger 1: Mount - Load messages and set active conversation
  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
      setActiveConversation(conversationId);
      // Trigger mark as read with debounce
      triggerMarkAsRead();
    }
    
    // UNMOUNT CLEANUP: Clear active conversation when window closes
    // This prevents "False Positive Read" (Zombi Okuma) bug
    return () => {
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }
      // Critical: Clear active conversation to stop auto-read on incoming messages
      setActiveConversation(null);
    };
  }, [conversationId, loadMessages, setActiveConversation, triggerMarkAsRead]);
  
  // Trigger 2: New incoming message while window is open
  useEffect(() => {
    if (conversationMessages.length > 0 && conversationId) {
      triggerMarkAsRead();
    }
  }, [conversationMessages.length, conversationId, triggerMarkAsRead]);
  
  // Trigger 3: Page visibility change (user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && conversationId) {
        triggerMarkAsRead();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [conversationId, triggerMarkAsRead]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Handle input change with debounced typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (!conversationId) return;
    
    // Send typing indicator
    if (value.length > 0) {
      sendTypingIndicator(conversationId, true);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing indicator after 2 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(conversationId, false);
      }, 2000);
    } else {
      // Immediately stop typing if input is empty
      sendTypingIndicator(conversationId, false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || isSending) return;

    // Stop typing indicator when sending
    sendTypingIndicator(conversationId, false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const messageContent = newMessage;
    setNewMessage("");
    setIsSending(true);
    
    // Immediately restore focus to allow continued typing
    inputRef.current?.focus();

    try {
      await sendMessage(conversationId, messageContent);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
      // Re-focus after async operation completes
      inputRef.current?.focus();
    }
  };

  if (!conversationId || !conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-lg font-medium">Sohbet seçin</p>
        <p className="text-sm text-gray-400 mt-1">Soldan bir konuşma seçerek sohbete başlayın</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-[#34495E] to-[#2c3e50] flex items-center gap-4 shadow-lg">
        <div className="relative">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md ${
            conversation.type === "Group"
              ? "bg-gradient-to-br from-emerald-500 to-teal-600"
              : "bg-gradient-to-br from-[#1ABC9C] to-[#16a085]"
          }`}>
            {conversation.type === "Group" ? (
              <Users className="w-6 h-6" />
            ) : (
              getTitle().charAt(0).toUpperCase()
            )}
          </div>
          {conversation.type === "Direct" && isOtherUserOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 border-2 border-[#34495E] rounded-full"></div>
          )}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-white text-sm truncate whitespace-nowrap max-w-[180px]">{getTitle()}</div>
          <div className="flex items-center gap-2 mt-0.5">
            {conversation.type === "Group" ? (
              <span className="text-xs text-white/70">
                {conversation.participants.length} üye
              </span>
            ) : (
              <>
                {currentTypingUsers.length > 0 ? (
                  // Show typing indicator in header
                  <>
                    <div className="flex gap-0.5">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs text-green-400 font-medium">yazıyor...</span>
                  </>
                ) : (
                  // Show online/offline status
                  <>
                    <div className={`w-2 h-2 rounded-full ${isOtherUserOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    <span className="text-xs text-white/90 font-medium">
                      {isOtherUserOnline ? "Çevrimiçi" : "Çevrimdışı"}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        {(onMinimize || onClose) && (
          <div className="flex gap-2">
            {onMinimize && (
              <button onClick={onMinimize} className="w-9 h-9 flex items-center justify-center hover:bg-white/15 rounded-xl transition-all text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                </svg>
              </button>
            )}
            {onClose && (
              <button onClick={onClose} className="w-9 h-9 flex items-center justify-center hover:bg-red-500/20 rounded-xl transition-all text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Messages Area */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {conversationMessages.length === 0 ? (
            <div className="text-center text-gray-400 py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p>Henüz mesaj yok. Sohbete başlayın! 👋</p>
            </div>
          ) : (
            conversationMessages.map((msg) => {
              const isMyMessage = msg.senderId === MY_USER_ID;
              const showSenderName = conversation.type === "Group" && !isMyMessage;
              
              return (
                <div 
                  key={msg.id} 
                  className={`flex w-full ${isMyMessage ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[75%] ${msg.isPending ? "opacity-70" : ""}`}>
                    {/* Sender name for group chats */}
                    {showSenderName && (
                      <div className="text-xs text-gray-500 mb-1 ml-1 font-medium">
                        {msg.senderName || "Bilinmeyen"}
                      </div>
                    )}
                    <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                      isMyMessage
                        ? msg.isFailed 
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : "bg-gradient-to-br from-[#1ABC9C] to-[#16a085] text-white"
                        : "bg-white text-gray-800 border border-gray-100"
                    }`}>
                      <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                      <div className="flex justify-end items-center gap-2 mt-1.5">
                        <span className={`text-[10px] ${
                          isMyMessage 
                            ? msg.isFailed ? "text-red-500" : "text-white/70" 
                            : "text-gray-400"
                        }`}>
                          {msg.isFailed 
                            ? "Gönderilemedi" 
                            : new Date(msg.sentAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
                          }
                        </span>
                        {isMyMessage && !msg.isFailed && (
                          <span className="inline-flex items-center">
                            {msg.isPending ? (
                              <Loader2 className="w-3 h-3 text-white/70 animate-spin" />
                            ) : msg.isRead ? (
                              <svg className="w-4 h-4 text-white/70" viewBox="0 0 16 15" fill="currentColor">
                                <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-white/70" viewBox="0 0 12 11" fill="currentColor">
                                <path d="M11.1 2.3L10.6 1.9C10.5 1.8 10.4 1.8 10.3 1.9L4.6 8.8C4.5 8.9 4.4 8.9 4.3 8.8L1.9 6.6C1.8 6.5 1.6 6.5 1.5 6.6L1.1 7C1 7.1 1 7.3 1.1 7.4L4.1 10.3C4.2 10.4 4.4 10.4 4.5 10.3L11.2 2.8C11.2 2.6 11.2 2.4 11.1 2.3Z" />
                              </svg>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input Area */}
      {!isMinimized && (
        <div className="p-3 bg-white/80 backdrop-blur-sm border-t border-gray-200/50">
          <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              placeholder={conversation.type === "Group" ? "Gruba mesaj yazın..." : "Mesaj yazın..."}
              className="flex-1 min-w-0 px-4 py-2.5 border-2 border-gray-200 bg-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1ABC9C]/50 focus:border-[#1ABC9C] text-sm text-gray-800 transition-all placeholder:text-gray-400"
              autoFocus
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="bg-gradient-to-br from-[#1ABC9C] to-[#16a085] hover:from-[#16a085] hover:to-[#1ABC9C] text-white p-2.5 rounded-2xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};