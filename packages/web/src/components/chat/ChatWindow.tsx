"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSignalR } from "@/context/SignalRContext";

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
}

interface ChatWindowProps {
  otherUserId: string | null;
  onMinimize?: () => void;
  onClose?: () => void;
  isMinimized?: boolean;
}

// Token çözümleme ve Payload içindeki ID'yi bulma
const findMyIdInToken = (token: string | null, idToMatch?: string): string => {
  if (!token) return "";
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const payload = JSON.parse(jsonPayload);
    
    console.log("[ChatWindow] Token Payload Keys:", Object.keys(payload)); // Debug için

    // 1. Öncelik: Bilinen claim isimleri
    if (payload.PharmacyId) return String(payload.PharmacyId);
    if (payload.pharmacyId) return String(payload.pharmacyId);
    if (payload.id) return String(payload.id);
    
    // 2. Öncelik: Eğer elimizde eşleşecek bir ID varsa (mesajdan gelen), onu payload değerlerinde ara
    if (idToMatch) {
      const foundValue = Object.values(payload).find(val => String(val) === idToMatch);
      if (foundValue) return idToMatch;
    }

    return ""; 
  } catch (e) {
    console.error("Token error:", e);
    return "";
  }
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ otherUserId, onMinimize, onClose, isMinimized = false }) => {
  const { token, user } = useAuth();
  const { connection, isConnected } = useSignalR();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [otherUserProfile, setOtherUserProfile] = useState<PharmacyProfile | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOtherUserOnline = otherUserId ? onlineUsers.has(String(otherUserId)) : false;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, [messages]);

  // Fetch other user's profile
  useEffect(() => {
    if (!otherUserId || !token) return;
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"}/api/chat/profile/${otherUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const profile = await res.json();
          setOtherUserProfile(profile);
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      }
    };
    fetchProfile();
  }, [otherUserId, token]);

  // Fetch messages
  useEffect(() => {
    if (!otherUserId || !token) return;
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"}/api/chat/messages/${otherUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (error) {
        console.error("Failed to fetch messages", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [otherUserId, token]);

  // SignalR listeners
  useEffect(() => {
    if (!connection) return;

    const handleReceiveMessage = (message: any) => {
      const msgSenderId = String(message.senderId || message.SenderId);
      
      let myId = findMyIdInToken(token, msgSenderId);
      if (!myId && user) {
         myId = String(user.pharmacyId || user.id || '');
      }
      
      const currentChatPartnerId = String(otherUserId);
      const isMyMessage = msgSenderId === myId;
      const isFromCurrentChat = msgSenderId === currentChatPartnerId;

      if (isMyMessage || isFromCurrentChat) {
        const newMessageObj: Message = {
          id: message.id || message.Id,
          content: message.content || message.Content,
          senderId: Number(msgSenderId),
          sentAt: message.sentAt || message.SentAt,
          isRead: message.isRead || false
        };

        setMessages((prev) => {
          const exists = prev.some(m => 
            m.id === newMessageObj.id || 
            (m.senderId === newMessageObj.senderId && m.content === newMessageObj.content && Math.abs(new Date(m.sentAt).getTime() - new Date(newMessageObj.sentAt).getTime()) < 2000)
          );
          
          if (exists) return prev;
          return [...prev, newMessageObj];
        });

        // Mark as read if from other user
        if (!isMyMessage && connection) {
          connection.invoke("MarkAsRead", message.id || message.Id).catch(err => 
            console.error("Failed to mark as read:", err)
          );
        }
      }
    };

    const handleMessageRead = (data: { messageId: string }) => {
      setMessages(prev => prev.map(m => 
        m.id === data.messageId ? { ...m, isRead: true } : m
      ));
    };

    const handleUserOnline = (userId: string) => {
      setOnlineUsers(prev => new Set(prev).add(userId));
    };

    const handleUserOffline = (userId: string) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    };

    connection.on("ReceiveMessage", handleReceiveMessage);
    connection.on("MessageRead", handleMessageRead);
    connection.on("UserOnline", handleUserOnline);
    connection.on("UserOffline", handleUserOffline);
    
    return () => { 
      connection.off("ReceiveMessage", handleReceiveMessage);
      connection.off("MessageRead", handleMessageRead);
      connection.off("UserOnline", handleUserOnline);
      connection.off("UserOffline", handleUserOffline);
    };
  }, [connection, otherUserId, token, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !otherUserId || !connection) return;

    const messageContent = newMessage;
    setNewMessage(""); // Inputu hemen temizle
    
    // --- OPTIMISTIC UI UPDATE ---
    // Cevap beklemeden mesajı ekrana basıyoruz (Anlık hissi verir)
    const tempId = `temp-${Date.now()}`;
    const myTempId = user?.pharmacyId ? Number(user.pharmacyId) : 0; // Varsa kullan yoksa 0 (görsel için yeterli)
    
    const optimisticMessage: Message = {
      id: tempId,
      content: messageContent,
      senderId: myTempId, // Bu değer geçicidir
      sentAt: new Date().toISOString(),
      isRead: false
    };

    // Mesajı hemen listeye ekle
    setMessages(prev => [...prev, optimisticMessage]);
    setTimeout(() => inputRef.current?.focus(), 50);

    try {
      await connection.invoke("SendMessage", {
        ReceiverId: Number(otherUserId),
        Content: messageContent,
      });
      // Başarılı olursa bir şey yapmaya gerek yok, SignalR echo yapacak
      // Echo geldiğinde duplicate kontrolü sayesinde çift görünmeyecek
    } catch (error) {
      console.error("Mesaj gönderilemedi:", error);
      alert('Mesaj gönderilemedi.');
      // Hata olursa mesajı listeden kaldırabiliriz (opsiyonel)
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  if (!otherUserId) {
    return <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500">Sohbet seçin.</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header with User Info */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center gap-3 shadow-md">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
            {otherUserProfile?.profileImagePath ? (
              <img src={otherUserProfile.profileImagePath} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          {isOtherUserOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-blue-600 rounded-full"></div>
          )}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-white">{otherUserProfile?.pharmacyName || "Yükleniyor..."}</div>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isOtherUserOnline ? 'bg-green-300' : 'bg-gray-400'}`}></div>
            <span className="text-xs text-white/90">{isOtherUserOnline ? "Çevrimiçi" : "Çevrimdışı"}</span>
          </div>
        </div>
        {(onMinimize || onClose) && (
          <div className="flex gap-2">
            {onMinimize && (
              <button 
                onClick={onMinimize}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors text-white"
                title="Küçült"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
            )}
            {onClose && (
              <button 
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors text-white"
                title="Kapat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Messages - Hidden when minimized */}
      {!isMinimized && (
      <div className="flex-1 overflow-y-auto bg-gray-50 relative">
        <style jsx>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        <div className="absolute inset-0 p-4 space-y-3 overflow-y-auto hide-scrollbar">
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-10 text-sm">Henüz mesaj yok. 👋</div>
          ) : (
            messages.map((msg) => {
              const isTemp = msg.id.startsWith('temp-');
              let isMyMessage = isTemp;
              
              if (!isMyMessage) {
                 const myId = findMyIdInToken(token);
                 isMyMessage = String(msg.senderId) === myId;
                 if (!isMyMessage && String(msg.senderId) !== String(otherUserId)) {
                    isMyMessage = true;
                 }
              }

              return (
                <div key={msg.id} className={`flex w-full ${isMyMessage ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${isMyMessage ? "bg-blue-500 text-white rounded-br-sm" : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"}`}>
                    <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                    <div className="flex justify-end items-center gap-1.5 mt-1">
                        <span className={`text-[10px] ${isMyMessage ? "text-blue-100" : "text-gray-400"}`}>
                        {new Date(msg.sentAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isTemp && <span className="text-[10px] opacity-70">🕒</span>}
                        {!isTemp && isMyMessage && (
                          <span className="inline-flex items-center">
                            {msg.isRead ? (
                              <svg className="w-4 h-4 text-blue-100" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" fill="currentColor"/>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-blue-100" viewBox="0 0 12 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.1 2.3L10.6 1.9C10.5 1.8 10.4 1.8 10.3 1.9L4.6 8.8C4.5 8.9 4.4 8.9 4.3 8.8L1.9 6.6C1.8 6.5 1.6 6.5 1.5 6.6L1.1 7C1 7.1 1 7.3 1.1 7.4L4.1 10.3C4.2 10.4 4.4 10.4 4.5 10.3L11.2 2.8C11.2 2.6 11.2 2.4 11.1 2.3Z" fill="currentColor"/>
                              </svg>
                            )}
                          </span>
                        )}
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

      {/* Input - Hidden when minimized */}
      {!isMinimized && (
      <div className="p-2 bg-white border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Mesaj yazın..."
            className="flex-1 px-3 py-2 border border-gray-300 bg-gray-50 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm text-gray-800"
            autoFocus
          />
          <button type="submit" disabled={!newMessage.trim() || !connection} className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
          </button>
        </form>
      </div>
      )}
    </div>
  );
};