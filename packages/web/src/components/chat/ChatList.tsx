"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useChatContext } from "@/store/ChatContext";
import { useSignalR } from "@/store/SignalRContext";
import { useAuth } from "@/store/AuthContext";

interface PharmacyProfile {
  id: string;
  pharmacyName: string;
  profileImagePath?: string;
  city?: string;
  district?: string;
}

interface ChatListProps {
  onSelectChat: (userId: string) => void;
  selectedUserId: string | null;
}

export const ChatList: React.FC<ChatListProps> = ({ onSelectChat, selectedUserId }) => {
  const { messages } = useChatContext();
  const { onlineUsers } = useSignalR();
  const { token, isLoading: isAuthLoading } = useAuth();
  const [users, setUsers] = useState<PharmacyProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch group members from API
  useEffect(() => {
    const fetchGroupMembers = async () => {
      if (isAuthLoading || !token) return;
      
      try {
        const API_BASE_URL = '';
        const response = await fetch(`${API_BASE_URL}/api/groups/my-groups/statistics`, {
          credentials: 'include', // Send cookies
          headers: token && token !== 'cookie-managed' 
            ? { 'Authorization': `Bearer ${token}` }
            : {}
        });
        
        if (response.ok) {
          const data = await response.json();
          // Extract unique pharmacies from group statistics
          const uniquePharmacies = new Map<string, PharmacyProfile>();
          data.forEach((stat: any) => {
            if (stat.pharmacyId && !uniquePharmacies.has(String(stat.pharmacyId))) {
              uniquePharmacies.set(String(stat.pharmacyId), {
                id: String(stat.pharmacyId),
                pharmacyName: stat.pharmacyName || 'Bilinmeyen Eczane',
                district: stat.district,
                city: stat.district // Using district as city fallback
              });
            }
          });
          setUsers(Array.from(uniquePharmacies.values()));
        }
      } catch (error) {
        console.error("[ChatList] Grup üyeleri çekilemedi:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGroupMembers();
  }, [token, isAuthLoading]);

  // Build conversations from real data
  const conversations = useMemo(() => {
    return users.map(user => {
      const userMessages = messages[user.id] || [];
      const lastMessage = userMessages[userMessages.length - 1];
      const unreadCount = userMessages.filter(msg => !msg.isRead && msg.senderId !== "2").length;
      
      return {
        id: user.id,
        otherUser: {
          id: user.id,
          pharmacyName: user.pharmacyName,
          profileImagePath: user.profileImagePath || null,
          city: user.city || user.district || "",
        },
        lastMessage: lastMessage?.content || "Henüz mesaj yok",
        lastMessageDate: lastMessage?.sentAt || new Date().toISOString(),
        unreadCount: unreadCount,
        isOnline: onlineUsers.has(user.id)
      };
    }).sort((a, b) => {
      // Sort by last message date, most recent first
      return new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime();
    });
  }, [users, messages, onlineUsers]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-white w-full">
        <div className="p-4 text-center text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white w-full">
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            Grup üyesi bulunamadı. Bir gruba katılın veya oluşturun.
          </div>
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
                {/* Online Indicator */}
                {conv.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
                {/* Unread Count Badge */}
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
                <div className="flex items-center gap-1">
                  <p className="text-sm text-gray-500 truncate flex-1">{conv.lastMessage}</p>
                  {conv.otherUser.city && (
                    <span className="text-xs text-gray-400">• {conv.otherUser.city}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
