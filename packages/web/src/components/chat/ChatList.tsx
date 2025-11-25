"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSignalR } from "@/context/SignalRContext";

interface Conversation {
  id: string;
  otherUser: {
    id: string; // Changed to string to handle large numbers
    pharmacyName: string;
    profileImagePath: string | null;
  };
  lastMessage: string;
  lastMessageDate: string;
  unreadCount: number;
}

interface ChatListProps {
  onSelectChat: (userId: string) => void;
  selectedUserId: string | null;
}

export const ChatList: React.FC<ChatListProps> = ({ onSelectChat, selectedUserId }) => {
  const { token } = useAuth();
  const { connection } = useSignalR();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"}/api/chat/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Failed to fetch conversations", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    // Poll for updates every 10 seconds (optional, SignalR should handle real-time updates ideally)
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!connection) return;

    connection.on("ReceiveMessage", () => {
      fetchConversations();
    });

    return () => {
      connection.off("ReceiveMessage");
    };
  }, [connection]);

  if (loading) return <div className="p-4">Yükleniyor...</div>;

  return (
    <div className="flex flex-col h-full bg-white w-full">
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">Henüz mesajınız yok.</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectChat(conv.otherUser.id)}
              className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedUserId === conv.otherUser.id ? "bg-blue-50" : ""
              }`}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                  {conv.otherUser.profileImagePath ? (
                    <img src={conv.otherUser.profileImagePath} alt={conv.otherUser.pharmacyName} className="w-full h-full object-cover" />
                  ) : (
                    conv.otherUser.pharmacyName.charAt(0).toUpperCase()
                  )}
                </div>
                {conv.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {conv.unreadCount}
                  </div>
                )}
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{conv.otherUser.pharmacyName}</h3>
                  <span className="text-xs text-gray-500">
                    {new Date(conv.lastMessageDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
