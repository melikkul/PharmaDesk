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

interface ChatWindowProps {
  otherUserId: string | null;
  onBack?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ otherUserId, onBack }) => {
  const { token, user } = useAuth();
  const { connection } = useSignalR();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    console.log('[ChatWindow] Messages state updated, new length:', messages.length);
    // Delay scroll to ensure DOM has updated
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  }, [messages]);

  useEffect(() => {
    if (!otherUserId || !token) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"}/api/chat/messages/${otherUserId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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

  useEffect(() => {
    if (!connection) return;

    const handleReceiveMessage = (message: any) => {
      console.log('[ChatWindow] ReceiveMessage event:', JSON.stringify(message, null, 2));
      
      const currentUserId = String(user?.pharmacyId);
      const messageSenderId = String(message.senderId || message.SenderId);
      const otherUserIdStr = String(otherUserId);
      
      console.log(`[ChatWindow] ID Comparison:
        currentUserId: "${currentUserId}" (type: ${typeof currentUserId})
        messageSenderId: "${messageSenderId}" (type: ${typeof messageSenderId})
        otherUserIdStr: "${otherUserIdStr}" (type: ${typeof otherUserIdStr})
        rawUserPharmacyId: ${user?.pharmacyId}
        rawMessageSenderId: ${message.senderId || message.SenderId}
        rawOtherUserId: ${otherUserId}
      `);
      
      // Map backend response (PascalCase) to frontend interface (camelCase)
      const mappedMessage: Message = {
        id: message.id || message.Id,
        content: message.content || message.Content,
        senderId: Number(message.senderId || message.SenderId),
        sentAt: message.sentAt || message.SentAt,
        isRead: message.isRead || false
      };
      
      // Show message if:
      // 1. I sent it (messageSenderId === currentUserId)
      // 2. Other user sent it (messageSenderId === otherUserId)
      const isMyMessage = messageSenderId === currentUserId;
      const isOtherUserMessage = messageSenderId === otherUserIdStr;
      
      console.log(`[ChatWindow] Message check:
        isMyMessage: ${isMyMessage} (${messageSenderId} === ${currentUserId})
        isOtherUserMessage: ${isOtherUserMessage} (${messageSenderId} === ${otherUserIdStr})
      `);
      
      if (isMyMessage || isOtherUserMessage) {
        console.log('[ChatWindow] Adding message to UI:', { isMyMessage, isOtherUserMessage, mappedMessage });
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some(m => m.id === mappedMessage.id)) {
            console.log('[ChatWindow] Duplicate message, skipping');
            return prev;
          }
          console.log('[ChatWindow] Adding new message. Previous count:', prev.length);
          return [...prev, mappedMessage];
        });
      } else {
        console.log('[ChatWindow] Message not for this conversation, ignoring');
      }
    };

    connection.on("ReceiveMessage", handleReceiveMessage);

    return () => {
      connection.off("ReceiveMessage", handleReceiveMessage);
    };
  }, [connection, otherUserId, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !otherUserId || !connection) return;

    console.log('[ChatWindow] Sending message:', { otherUserId, newMessage });

    try {
      // CRITICAL: Backend expects ReceiverId as STRING and Content (capital letters)
      // Do NOT convert to Number - causes precision loss!
      await connection.invoke("SendMessage", {
        ReceiverId: otherUserId,  // Keep as string!
        Content: newMessage,
      });
      console.log('[ChatWindow] Message sent successfully');
      setNewMessage("");
      // Restore focus to input field
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (error) {
      console.error("[ChatWindow] Failed to send message:", error);
      alert('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
    }
  };

  if (!otherUserId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-500">
        Mesajlaşmaya başlamak için bir sohbet seçin.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 hide-scrollbar">
        {loading ? (
          <div className="text-center text-gray-500 py-8">Yükleniyor...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            Henüz mesaj yok. İlk mesajı gönderin!
          </div>
        ) : (
          messages.map((msg) => {
            const isMyMessage = msg.senderId === Number(user?.pharmacyId);
            return (
              <div
                key={msg.id}
                className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    isMyMessage
                      ? "bg-gradient-to-r from-[#2D8B57] to-[#1F603C] text-white rounded-br-sm"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <span
                    className={`text-[10px] block text-right mt-1 ${
                      isMyMessage ? "text-green-100" : "text-gray-400"
                    }`}
                  >
                    {new Date(msg.sentAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Bir mesaj yazın..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !connection}
            className="bg-gradient-to-r from-[#2D8B57] to-[#1F603C] text-white px-4 py-3 rounded-lg hover:from-[#1F603C] hover:to-[#165028] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm shadow-sm flex items-center justify-center shrink-0"
            title="Gönder"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};
