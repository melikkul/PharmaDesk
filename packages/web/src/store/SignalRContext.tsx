"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type ConnectionState = "Connected" | "Disconnected" | "Reconnecting";

interface SignalRContextType {
  connectionState: ConnectionState;
  connection: signalR.HubConnection | null;
  onlineUsers: Set<string>;
}

const SignalRContext = createContext<SignalRContextType>({
  connectionState: "Disconnected",
  connection: null,
  onlineUsers: new Set<string>(),
});

export const useSignalR = () => useContext(SignalRContext);

interface SignalRProviderProps {
  children: React.ReactNode;
}

export const SignalRProvider: React.FC<SignalRProviderProps> = ({ children }) => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("Disconnected");
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set<string>());
  const queryClient = useQueryClient();

  const getAccessToken = useCallback(() => {
    // Try to get token from cookies first (httpOnly cookies won't be accessible)
    // So we need to check localStorage as fallback
    if (typeof window !== "undefined") {
      // Check localStorage for token
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      return token || "";
    }
    return "";
  }, []);

  useEffect(() => {
    // Use relative URL to leverage Next.js rewrites (proxies to backend)
    const apiUrl = "";
    const accessToken = getAccessToken();

    if (!accessToken) {
      console.log("[SignalR] No access token found, skipping connection");
      return;
    }

    let isMounted = true;
    let isConnecting = false;
    let currentConnection: signalR.HubConnection | null = null;
    const abortController = new AbortController();

    // Create connection with automatic reconnection
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${apiUrl}/hubs/notifications`, {
        accessTokenFactory: () => accessToken,
        // skipNegotiation: true, // Removed to allow negotiation
        // transport: signalR.HttpTransportType.WebSockets, // Removed to allow fallback
        withCredentials: true, // Changed to true for cookie-based affinity if needed
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff: 0s, 2s, 10s, 30s, then 60s
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          if (retryContext.previousRetryCount === 3) return 30000;
          return 60000;
        },
      })
      .configureLogging({
        log: (logLevel: signalR.LogLevel, message: string, ...args: any[]) => {
          // Suppress the specific race-condition error
          if (logLevel === signalR.LogLevel.Error && (
            message.includes("Failed to start the HttpConnection before stop() was called") ||
            message.includes("The connection was stopped during negotiation")
          )) {
            return;
          }
          // Forward other logs to console
          if (logLevel === signalR.LogLevel.Error) {
            console.error(`[SignalR] ${message}`, ...args);
          } else if (logLevel === signalR.LogLevel.Warning) {
            console.warn(`[SignalR] ${message}`, ...args);
          } else if (logLevel === signalR.LogLevel.Information) {
            // console.log(`[SignalR] ${message}`, ...args); // Uncomment for debug
          }
        }
      })
      .build();

    currentConnection = newConnection;

    // Connection lifecycle events
    newConnection.onclose((error) => {
      if (isMounted) {
        console.log("[SignalR] Connection closed", error);
        setConnectionState("Disconnected");
      }
      isConnecting = false;
    });

    newConnection.onreconnecting((error) => {
      if (isMounted) {
        console.log("[SignalR] Reconnecting...", error);
        setConnectionState("Reconnecting");
      }
    });

    newConnection.onreconnected((connectionId) => {
      if (isMounted) {
        console.log("[SignalR] Reconnected successfully", connectionId);
        setConnectionState("Connected");
        toast.success("Bağlantı yeniden kuruldu");
      }
    });

    // Listen for notifications from backend
    newConnection.on("ReceiveNotification", (notification: {
      message: string;
      type: string;
      timestamp: string;
      senderId?: string;
      targetUserId?: string; // 🆕 Hedef kullanıcı ID'si
    }) => {
      if (!isMounted) return;

      console.log("[SignalR] Received notification:", notification);

      // 🆕 entityUpdated için: tüm kullanıcılarda verileri yenile ama toast gösterme
      if (notification.type === "entityUpdated") {
        console.log("[SignalR] Entity updated, refreshing data silently...");
        queryClient.invalidateQueries();
        return; // Toast gösterme
      }

      // 🆕 Hedef kullanıcı kontrolü - targetUserId varsa sadece o kullanıcıda göster
      const currentUserId = localStorage.getItem("userId") || sessionStorage.getItem("userId");
      if (notification.targetUserId && notification.targetUserId !== currentUserId) {
        console.log("[SignalR] Notification not for this user, skipping toast");
        return; // Bu kullanıcı için değil, toast gösterme
      }

      // 🆕 SignalR bildirimleri sadece veri yenileme için kullanılıyor
      // Toast bildirimleri lokal olarak component'lerde gösteriliyor (OfferForm vb.)
      console.log("[SignalR] Received notification:", notification.type, notification.message);
      
      // Sessiz veri yenileme - toast gösterme
      queryClient.invalidateQueries();
    });

    // Listen for online users updates
    newConnection.on("ReceiveOnlineUsers", (users: string[]) => {
      if (!isMounted) return;
      console.log("[SignalR] Online users updated:", users);
      setOnlineUsers(new Set(users));
    });

    // Start connection with abort handling
    const startConnection = async () => {
      if (!isMounted || abortController.signal.aborted) return;

      isConnecting = true;

      try {
        await newConnection.start();

        // Check if we were aborted during the connection attempt
        if (abortController.signal.aborted || !isMounted) {
          // Connection started but we need to stop immediately
          await newConnection.stop();
          return;
        }

        console.log("[SignalR] Connected successfully");
        setConnectionState("Connected");
        setConnection(newConnection);
        isConnecting = false;
      } catch (error: any) {
        isConnecting = false;

        // Silently handle connection errors
        // Common errors during rapid mount/unmount:
        // - "Failed to start before stop" 
        // - Backend not available (401, 404, etc.)
        if (isMounted && !abortController.signal.aborted) {
          // Only log if it's NOT the "stop before start" error
          if (!error?.message?.includes('stop() was called')) {
            console.log("[SignalR] Connection failed (silent):", error?.message);
          }
          setConnectionState("Disconnected");
        }
        // Will automatically retry with the configured strategy
      }
    };

    startConnection();

    // Cleanup on unmount
    return () => {
      isMounted = false;

      // Signal abort to prevent connection from completing
      abortController.abort();

      if (currentConnection) {
        const connectionState = currentConnection.state;
        console.log("[SignalR] Cleanup - connection state:", connectionState);

        // Wait for ongoing connection attempt to finish before stopping
        const cleanup = async () => {
          // If we're currently connecting, wait a bit for it to finish or abort
          if (isConnecting) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Now safely stop if not already disconnected
          if (currentConnection &&
            connectionState !== signalR.HubConnectionState.Disconnected &&
            connectionState !== signalR.HubConnectionState.Disconnecting) {
            try {
              await currentConnection.stop();
            } catch (err) {
              // Silently ignore cleanup errors
            }
          }
        };

        cleanup();
      }

      setConnection(null);
      setConnectionState("Disconnected");
    };
  }, [getAccessToken, queryClient]);

  return (
    <SignalRContext.Provider value={{ connectionState, connection, onlineUsers }}>
      {children}
    </SignalRContext.Provider>
  );
};
