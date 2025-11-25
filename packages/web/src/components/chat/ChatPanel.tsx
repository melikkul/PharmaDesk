"use client";

import React, { useState } from "react";
import { ChatList } from "./ChatList";
import { ChatWindow } from "./ChatWindow";

interface ChatPanelProps {
  activeUserId: string | null;
  onSelectUser: (userId: string | null) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ activeUserId, onSelectUser }) => {
  return (
    <div className="h-full flex flex-col bg-white">
      {activeUserId ? (
        <ChatWindow 
          otherUserId={activeUserId} 
          onBack={() => onSelectUser(null)} 
        />
      ) : (
        <ChatList 
          onSelectChat={onSelectUser} 
          selectedUserId={null} 
        />
      )}
    </div>
  );
};
