'use client';
import { createContext, useContext } from 'react';
import { 
  type Notification as TNotification, 
  type Message as TMessage,
  type PharmacyProfileData
} from '@/data/dashboardData';

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
  handleLogout: () => void;
  handleNotificationClick: (notification: TNotification) => void;
  markAllNotificationsAsRead: (e: React.MouseEvent) => void;
  handleMessageClick: (message: TMessage) => void;
  markAllMessagesAsRead: (e: React.MouseEvent) => void;
  toggleNotificationsPanel: () => void;
  toggleMessagesPanel: () => void;
  toggleCartPanel: () => void;
  unreadNotificationCount: number;
  unreadMessageCount: number;
  closeNotificationModal: () => void;
  closeChatWindow: () => void;
  handleStartChat: (pharmacy: PharmacyProfileData) => void;
  activeChatUserId: number | null;
  setActiveChatUserId: (userId: number | null) => void;
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
