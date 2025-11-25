"use client";

import React, { useState } from "react";
import { ChatList } from "./ChatList";
import { ChatWindow } from "./ChatWindow";

export const ChatLayout = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      <ChatList onSelectChat={setSelectedUserId} selectedUserId={selectedUserId} />
      <ChatWindow otherUserId={selectedUserId} />
    </div>
  );
};
