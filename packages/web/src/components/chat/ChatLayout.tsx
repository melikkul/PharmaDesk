"use client";

import React from "react";
import { ChatList } from "./ChatList";
import { ChatWindow } from "./ChatWindow";
import { useChatContext } from "@/store/ChatContext";

export const ChatLayout = () => {
  const { activeConversationId, setActiveConversation } = useChatContext();

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      <div className="w-80 border-r border-gray-200 flex-shrink-0">
        <ChatList 
          onSelectChat={setActiveConversation} 
          selectedConversationId={activeConversationId} 
        />
      </div>
      <div className="flex-1">
        <ChatWindow conversationId={activeConversationId} />
      </div>
    </div>
  );
};
