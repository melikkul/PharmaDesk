"use client";

import React from "react";
import { ChatList } from "./ChatList";
import { useChatContext } from "@/store/ChatContext";
import { useDashboardContext } from "@/store/DashboardContext";

interface ChatPanelProps {
  onSelectUser?: (userId: string) => void; // Legacy prop, optional
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ onSelectUser }) => {
  const { activeConversationId } = useChatContext();
  const { openFloatingChat, toggleMessagesPanel } = useDashboardContext();

  const handleSelectConversation = (conversationId: number) => {
    // Open floating chat window with the conversation ID
    // Note: openFloatingChat already closes the messages panel
    openFloatingChat(String(conversationId));
    
    // Also call legacy callback if provided
    if (onSelectUser) {
      onSelectUser(String(conversationId));
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <ChatList 
        onSelectChat={handleSelectConversation} 
        selectedConversationId={activeConversationId} 
      />
    </div>
  );
};

