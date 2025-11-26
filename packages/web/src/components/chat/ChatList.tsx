"use client";

import React, { useMemo } from "react";
import { useMockChat } from "@/store/MockChatContext";

interface ChatListProps {
  onSelectChat: (userId: string) => void;
  selectedUserId: string | null;
}

export const ChatList: React.FC<ChatListProps> = ({ onSelectChat, selectedUserId }) => {
  const { users, messages, onlineUsers } = useMockChat();

  // Build conversations from mock data
  const conversations = useMemo(() => {
    return users.map(user => {
      const userMessages = messages[user.id] || [];
      const lastMessage = userMessages[userMessages.length - 1];
      const unreadCount = userMessages.filter(msg => !msg.isRead && msg.senderId !== 2).length; // 2 is the current user
      
      return {
        id: user.id,
        otherUser: {
          id: user.id,
          pharmacyName: user.pharmacyName,
          profileImagePath: user.profileImagePath || null,
          city: user.city || "",
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
