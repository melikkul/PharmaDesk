"use client";

import React, { useEffect, useState, useRef } from "react";
import { useMockChat } from "@/store/MockChatContext";
import { useChatContext } from "@/store/ChatContext";

interface Message {
  id: string;
  content: string;
  senderId: number;
  sentAt: string;
  isRead: boolean;
}

interface ChatWindowProps {
  otherUserId: string | null;
  onMinimize?: () => void;
  onClose?: () => void;
  isMinimized?: boolean;
}

const MY_USER_ID = 2; // Current user PharmacyId=2 (melik_kul@outlook.com)

export const ChatWindow: React.FC<ChatWindowProps> = ({ otherUserId, onMinimize, onClose, isMinimized = false }) => {
  const { users, onlineUsers } = useMockChat();
  const { messages, sendMessage } = useChatContext();
  
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const otherUserProfile = users.find(u => u.id === otherUserId);
  const isOtherUserOnline = otherUserId ? onlineUsers.has(String(otherUserId)) : false;
  const conversationMessages = otherUserId ? (messages[otherUserId] || []) : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [conversationMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !otherUserId) return;

    const messageContent = newMessage;
    setNewMessage(""); // Clear input immediately
    
    try {
      await sendMessage(otherUserId, messageContent);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (error) {
      console.error("Failed to send message:", error);
      alert('Mesaj gönderilemedi.');
    }
  };

  if (!otherUserId) {
    return <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500">Sohbet seçin.</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden shadow-xl">
      {/* Header with User Info - Modern glassmorphism style */}
      <div className="p-5 bg-gradient-to-r from-[#34495E] to-[#2c3e50] flex items-center gap-4 shadow-lg backdrop-blur-sm">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1ABC9C] to-[#16a085] flex items-center justify-center text-white font-bold text-xl overflow-hidden shadow-md transform transition-transform hover:scale-105">
            {otherUserProfile?.profileImagePath ? (
              <img src={otherUserProfile.profileImagePath} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              otherUserProfile?.pharmacyName.charAt(0).toUpperCase() || "?"
            )}
          </div>
          {isOtherUserOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 border-3 border-[#34495E] rounded-full animate-pulse shadow-lg"></div>
          )}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-white text-lg">{otherUserProfile?.pharmacyName || "Yükleniyor..."}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <div className={`w-2 h-2 rounded-full ${isOtherUserOnline ? 'bg-green-400' : 'bg-gray-400'} shadow-sm`}></div>
            <span className="text-xs text-white/90 font-medium">{isOtherUserOnline ? "Çevrimiçi" : "Çevrimdışı"}</span>
            {otherUserProfile?.city && <span className="text-xs text-white/60">• {otherUserProfile.city}</span>}
          </div>
        </div>
        {(onMinimize || onClose) && (
          <div className="flex gap-2">
            {onMinimize && (
              <button 
                onClick={onMinimize}
                className="w-9 h-9 flex items-center justify-center hover:bg-white/15 rounded-xl transition-all duration-200 text-white hover:scale-105 active:scale-95"
                title="Küçült"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                </svg>
              </button>
            )}
            {onClose && (
              <button 
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center hover:bg-red-500/20 rounded-xl transition-all duration-200 text-white hover:scale-105 active:scale-95"
                title="Kapat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Messages - Hidden when minimized */}
      {!isMinimized && (
      <div className="flex-1 overflow-y-auto bg-transparent relative">
        <style jsx>{`.hide-scrollbar::-webkit-scrollbar { width: 6px; } .hide-scrollbar::-webkit-scrollbar-track { background: transparent; } .hide-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 10px; } .hide-scrollbar::-webkit-scrollbar-thumb:hover { background: #a0aec0; }`}</style>
        <div className="absolute inset-0 p-5 space-y-4 overflow-y-auto hide-scrollbar">
          {conversationMessages.length === 0 ? (
            <div className="text-center text-gray-400 py-16 text-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              Henüz mesaj yok. Sohbete başlayın! 👋
            </div>
          ) : (
            conversationMessages.map((msg) => {
              const isMyMessage = msg.senderId === MY_USER_ID;

              return (
                <div key={msg.id} className={`flex w-full ${isMyMessage ? "justify-end" : "justify-start"} animate-fade-in`}>
                  <div className={`max-w-[80%] group ${isMyMessage ? "" : ""}`}>
                    <div className={`rounded-3xl px-5 py-3 shadow-md transition-all duration-200 hover:shadow-lg ${
                      isMyMessage 
                        ? "bg-gradient-to-br from-[#1ABC9C] to-[#16a085] text-white rounded-br-md" 
                        : "bg-white text-gray-800 border border-gray-100 rounded-bl-md"
                    }`}>
                      <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                      <div className="flex justify-end items-center gap-2 mt-2">
                        <span className={`text-[10px] font-medium ${isMyMessage ? "text-white/70" : "text-gray-400"}`}>
                          {new Date(msg.sentAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMyMessage && (
                          <span className="inline-flex items-center">
                            {msg.isRead ? (
                              <svg className="w-4 h-4 text-white/70" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" fill="currentColor"/>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-white/70" viewBox="0 0 12 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.1 2.3L10.6 1.9C10.5 1.8 10.4 1.8 10.3 1.9L4.6 8.8C4.5 8.9 4.4 8.9 4.3 8.8L1.9 6.6C1.8 6.5 1.6 6.5 1.5 6.6L1.1 7C1 7.1 1 7.3 1.1 7.4L4.1 10.3C4.2 10.4 4.4 10.4 4.5 10.3L11.2 2.8C11.2 2.6 11.2 2.4 11.1 2.3Z" fill="currentColor"/>
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
      </div>
      )}

      {/* Input - Hidden when minimized - Modern design */}
      {!isMinimized && (
      <div className="p-2 bg-white/80 backdrop-blur-sm border-t border-gray-200/50">
        <form onSubmit={handleSendMessage} className="flex gap-1.5 items-center">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Mesaj yazın..."
            className="flex-1 min-w-0 px-3 py-2 border-2 border-gray-200 bg-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1ABC9C]/50 focus:border-[#1ABC9C] text-sm text-gray-800 transition-all duration-200 placeholder:text-gray-400"
            autoFocus
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()} 
            className="bg-gradient-to-br from-[#1ABC9C] to-[#16a085] hover:from-[#16a085] hover:to-[#1ABC9C] text-white p-2.5 rounded-2xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 transform hover:scale-105 active:scale-95 disabled:transform-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </div>
      )}
    </div>
  );
};