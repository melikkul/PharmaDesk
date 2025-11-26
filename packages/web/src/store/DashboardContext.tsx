'use client';
import { createContext, useContext } from 'react';
import { 
  type Message as TMessage,
  type PharmacyProfileData
} from '@/lib/dashboardData';
import { Notification as TNotification } from '@/types';

// Tipleri dışa aktar
export type SelectedNotification = TNotification & { detail?: string };
export type Notification = TNotification;
export type Message = TMessage;

export interface DashboardContextType {
  notifications: TNotification[];
  selectedNotification: SelectedNotification | null;
  messages: TMessage[];
  selectedChat: TMessage | null;
  showNotificationsPanel: boolean;
  showMessagesPanel: boolean;
  showCartPanel: boolean;
  // Floating chat windows
  openChats: string[];
  minimizedChats: string[];
  handleLogout: () => void;
  handleNotificationClick: (notification: TNotification) => void;
  markAllNotificationsAsRead: (e: React.MouseEvent) => void;
  handleMessageClick: (message: TMessage) => void;
  toggleNotificationsPanel: () => void;
  toggleMessagesPanel: () => void;
  toggleCartPanel: () => void;
  unreadNotificationCount: number;
  closeNotificationModal: () => void;
  closeChatWindow: () => void;
  handleStartChat: (pharmacy: PharmacyProfileData) => void;
  activeChatUserId: string | null;
  setActiveChatUserId: (userId: string | null) => void;
  // Floating window functions
  openFloatingChat: (userId: string) => void;
  closeChat: (userId: string) => void;
  toggleMinimizeChat: (userId: string) => void;
}

// Context'i oluştur
export const DashboardContext = createContext<DashboardContextType | null>(null);

// Hook'u tanımla
export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
};
