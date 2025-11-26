"use client";

import { useEffect } from "react";
import { useSignalR } from "@/context/SignalRContext";
import { useDashboardContext } from "@/context/DashboardContext";
import { useAuth } from "@/context/AuthContext";

/**
 * BackgroundMessageListener
 * 
 * This component runs in the background and listens for incoming SignalR messages.
 * When a message arrives from a user who is NOT the currently active chat participant,
 * it increments the global unread message count.
 * 
 * This ensures the Header badge updates in real-time even when the chat panel is closed.
 */
export const BackgroundMessageListener = () => {
  const { connection } = useSignalR();
  const { activeChatUserId, incrementUnreadCount } = useDashboardContext();
  const { user } = useAuth();

  useEffect(() => {
    if (!connection || !user) return;

    const handleReceiveMessage = (message: any) => {
      const msgSenderId = String(message.senderId || message.SenderId);
      const myId = String(user.pharmacyId || user.id || '');
      
      // Don't increment for my own messages
      if (msgSenderId === myId) return;
      
      // If chat is NOT open with this sender, increment the counter
      if (activeChatUserId !== msgSenderId) {
        incrementUnreadCount();
      }
    };

    connection.on("ReceiveMessage", handleReceiveMessage);

    return () => {
      connection.off("ReceiveMessage", handleReceiveMessage);
    };
  }, [connection, user, activeChatUserId, incrementUnreadCount]);

  return null; // This component renders nothing
};
