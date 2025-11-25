"use client";

import React from "react";
import { ChatList } from "./ChatList";

interface ChatPanelProps {
  onSelectUser: (userId: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ onSelectUser }) => {
  return (
    <div className="h-full flex flex-col bg-white">
      <ChatList 
        onSelectChat={onSelectUser} 
        selectedUserId={null} 
      />
    </div>
  );
};
