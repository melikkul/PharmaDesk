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
  otherUserId: number | null;
  onBack?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ otherUserId, onBack }) => {
  const { token, user } = useAuth();
  const { connection } = useSignalR();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
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

    connection.on("ReceiveMessage", (message: any) => {
      // Check if message belongs to current chat
      // message.senderId is number, otherUserId is number
      // If I am the sender, I also receive it back
      const currentUserId = Number(user?.pharmacyId);
      
      if (message.senderId === otherUserId || (message.senderId === currentUserId && otherUserId)) {
          // Verify if it belongs to this conversation
          // Ideally we check chatRoomId, but for now we check participants
          setMessages((prev) => {
              // Avoid duplicates
              if (prev.some(m => m.id === message.id)) return prev;
              return [...prev, message];
          });
      }
    });

    return () => {
      connection.off("ReceiveMessage");
    };
  }, [connection, otherUserId, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !otherUserId || !connection) return;

    try {
      await connection.invoke("SendMessage", {
        receiverId: otherUserId,
        content: newMessage,
      });
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message", error);
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
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200 flex items-center shadow-sm gap-2">
        {onBack && (
          <button 
            onClick={onBack}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="font-semibold text-gray-800">Sohbet</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center text-gray-500">Yükleniyor...</div>
        ) : (
          messages.map((msg) => {
            const isMyMessage = msg.senderId === Number(user?.pharmacyId);
            return (
              <div
                key={msg.id}
                className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                    isMyMessage
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <span
                    className={`text-[10px] block text-right mt-1 ${
                      isMyMessage ? "text-blue-100" : "text-gray-400"
                    }`}
                  >
                    {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Bir mesaj yazın..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !connection}
            className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Gönder
          </button>
        </form>
      </div>
    </div>
  );
};
