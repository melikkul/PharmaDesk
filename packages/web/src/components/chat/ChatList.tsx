"use client";

import React from "react";
import { useChatContext, Conversation } from "@/store/ChatContext";
import { useAuth } from "@/store/AuthContext";
import { Users, MessageCircle } from "lucide-react";

interface ChatListProps {
  onSelectChat: (conversationId: number) => void;
  selectedConversationId: number | null;
}

export const ChatList: React.FC<ChatListProps> = ({ onSelectChat, selectedConversationId }) => {
  // Use onlineUsers from ChatContext (connected to ChatHub) instead of SignalRContext (NotificationHub)
  const { conversations, isLoading, onlineUsers } = useChatContext();
  const { user } = useAuth();
  
  // Get current user's pharmacyId for comparison
  const myPharmacyId = user?.pharmacyId ? String(user.pharmacyId) : "";

  // Separate group and direct conversations
  const groupConversations = conversations.filter(c => c.type === "Group");
  const directConversations = conversations.filter(c => c.type === "Direct");

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return "Dün";
    } else if (diffDays < 7) {
      return date.toLocaleDateString('tr-TR', { weekday: 'short' });
    }
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const getConversationTitle = (conv: Conversation) => {
    if (conv.type === "Group") {
      return conv.groupName || "Grup Sohbeti";
    }
    // For direct chat, find the OTHER participant (not me) and show their name
    const otherParticipant = conv.participants.find(p => 
      String(p.userId) !== myPharmacyId
    );
    return otherParticipant?.pharmacyName || "Bilinmeyen Eczane";
  };

  const isParticipantOnline = (conv: Conversation) => {
    if (conv.type === "Group") return false; // Groups don't show online status
    // Find the other participant (not me)
    const otherParticipant = conv.participants.find(p =>
      String(p.userId) !== myPharmacyId
    );
    // onlineUsers is an array of PharmacyIds from ChatContext
    return otherParticipant ? onlineUsers.includes(String(otherParticipant.userId)) : false;
  };

  const renderConversationItem = (conv: Conversation) => {
    const isSelected = selectedConversationId === conv.id;
    const title = getConversationTitle(conv);
    const isOnline = isParticipantOnline(conv);
    
    return (
      <div
        key={conv.id}
        onClick={() => onSelectChat(conv.id)}
        className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
          isSelected ? "bg-blue-50 border-l-4 border-blue-500" : ""
        }`}
      >
        <div className="relative">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
            conv.type === "Group" 
              ? "bg-gradient-to-br from-emerald-500 to-teal-600" 
              : "bg-gradient-to-br from-blue-500 to-indigo-600"
          }`}>
            {conv.type === "Group" ? (
              <Users className="w-6 h-6" />
            ) : (
              title.charAt(0).toUpperCase()
            )}
          </div>
          
          {/* Online Indicator (only for direct chats) */}
          {conv.type === "Direct" && isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          )}
          
          {/* Unread Count Badge */}
          {conv.unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
            </div>
          )}
        </div>
        
        <div className="ml-4 flex-1 min-w-0">
          <div className="flex justify-between items-baseline">
            <h3 className={`text-xs font-medium truncate whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px] ${
              conv.unreadCount > 0 ? "text-gray-900 font-semibold" : "text-gray-700"
            }`}>
              {title}
            </h3>
            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
              {formatTime(conv.lastMessageAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <p className={`text-sm truncate flex-1 ${
              conv.unreadCount > 0 ? "text-gray-800 font-medium" : "text-gray-500"
            }`}>
              {conv.lastMessagePreview || "Henüz mesaj yok"}
            </p>
            {conv.type === "Group" && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">
                Grup
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-white w-full">
        <div className="p-4 text-center text-gray-500">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white w-full">
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-6 text-center">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Henüz konuşma yok</p>
            <p className="text-sm text-gray-400 mt-1">
              Bir gruba katılarak veya eczane seçerek sohbet başlatabilirsiniz.
            </p>
          </div>
        ) : (
          <>
            {/* Group Chats Section */}
            {groupConversations.length > 0 && (
              <>
                <div className="px-4 py-2 bg-gray-50 border-b">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Grup Sohbetleri
                  </span>
                </div>
                {groupConversations.map(renderConversationItem)}
              </>
            )}
            
            {/* Direct Chats Section */}
            {directConversations.length > 0 && (
              <>
                <div className="px-4 py-2 bg-gray-50 border-b">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Bireysel Sohbetler
                  </span>
                </div>
                {directConversations.map(renderConversationItem)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
