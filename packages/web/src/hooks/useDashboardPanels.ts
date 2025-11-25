// src/hooks/useDashboardPanels.ts
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from './useNotifications';
// import { useMessages } from './useMessages';

// Tipleri data dosyasından import ediyoruz
import { 
  type Notification as TNotification, 
  type Message as TMessage,
  type PharmacyProfileData
} from '@/data/dashboardData';

// Tipleri dışa aktar
import { SelectedNotification } from '@/context/DashboardContext';
// YENİ: ChatContext import et
// import { useChatContext } from '@/context/ChatContext';
export type Notification = TNotification;
export type Message = TMessage;

export const useDashboardPanels = () => {
  const router = useRouter();
  const { token } = useAuth();
  
  // YENİ: Conversations ChatContext'ten geliyor
  // During build time, context may be null - provide safe default
  // const chatContext = useChatContext();
  // const conversations = chatContext?.conversations ?? [];

  // Real data hooks
  const { 
    notifications, 
    markAsRead: markNotificationAsRead, 
    markAllAsRead: markAllNotificationsAsReadApi 
  } = useNotifications(token);

  // Messages artık ChatContext'ten geliyor
  // Messages artık ChatContext'ten geliyor
  const messages: TMessage[] = []; // conversations;
  

  const [selectedNotification, setSelectedNotification] = useState<SelectedNotification | null>(null);
  const [selectedChat, setSelectedChat] = useState<TMessage | null>(null);
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);

  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);
  const [showCartPanel, setShowCartPanel] = useState(false);

  // Floating chat windows state
  const [openChats, setOpenChats] = useState<string[]>([]);
  const [minimizedChats, setMinimizedChats] = useState<string[]>([]);

  // DEBUG: Monitor showMessagesPanel state changes
  useEffect(() => {
    console.log('[useDashboardPanels] showMessagesPanel changed to:', showMessagesPanel);
  }, [showMessagesPanel]);

  // DEBUG: Monitor activeChatUserId state changes
  useEffect(() => {
    console.log('[useDashboardPanels] activeChatUserId changed to:', activeChatUserId);
  }, [activeChatUserId]);

  const handleLogout = useCallback(() => {
    if (window.confirm("Çıkış yapmak istediğinizden emin misiniz?")) {
      router.push('/anasayfa');
    }
  }, [router]);

  const toggleNotificationsPanel = useCallback(() => {
      setShowNotificationsPanel(p => !p);
      setShowMessagesPanel(false);
      setShowCartPanel(false);
  }, []);

  const toggleMessagesPanel = useCallback(() => {
      setShowMessagesPanel(p => !p);
      setShowNotificationsPanel(false);
      setShowCartPanel(false);
  }, []);
  
  const toggleCartPanel = useCallback(() => {
      setShowCartPanel(p => !p);
      setShowNotificationsPanel(false);
      setShowMessagesPanel(false);
  }, []);

  // Floating chat window functions
  const openFloatingChat = useCallback((userId: string) => {
    console.log('[useDashboardPanels] Opening floating chat for:', userId);
    if (!openChats.includes(userId)) {
      setOpenChats([...openChats, userId]);
    }
    // Close messages panel when opening floating window
    setShowMessagesPanel(false);
  }, [openChats]);

  const closeChat = useCallback((userId: string) => {
    console.log('[useDashboardPanels] Closing chat for:', userId);
    setOpenChats(openChats.filter(id => id !== userId));
    setMinimizedChats(minimizedChats.filter(id => id !== userId));
  }, [openChats, minimizedChats]);

  const toggleMinimizeChat = useCallback((userId: string) => {
    console.log('[useDashboardPanels] Toggling minimize for:', userId);
    if (minimizedChats.includes(userId)) {
      setMinimizedChats(minimizedChats.filter(id => id !== userId));
    } else {
      setMinimizedChats([...minimizedChats, userId]);
    }
  }, [minimizedChats]);

  const handleNotificationClick = useCallback((notification: TNotification) => {
    setSelectedNotification(notification);
    markNotificationAsRead(notification.id);
    setShowNotificationsPanel(false);
  }, [markNotificationAsRead]);

  const markAllNotificationsAsRead = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      markAllNotificationsAsReadApi();
  }, [markAllNotificationsAsReadApi]);

  const handleMessageClick = useCallback((message: TMessage) => {
    setSelectedChat(message);
    // REMOVED: markMessageAsRead - ChatContext handles this automatically
    setShowMessagesPanel(false);
  }, []);

  const markAllMessagesAsRead = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      // Implement mark all messages as read API call if available
      // For now, we iterate or just rely on individual reads
  }, []);
  
  const handleStartChat = useCallback(async (pharmacy: PharmacyProfileData) => {
    if (!token) return;

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
      
      // Parse pharmacy ID to string (prevents JavaScript precision loss with large Long IDs)
      const receiverPharmacyId = String(pharmacy.id);
      
      console.log('[handleStartChat] Pharmacy object:', pharmacy);
      console.log('[handleStartChat] pharmacy.id (raw):', pharmacy.id);
      console.log('[handleStartChat] receiverPharmacyId (string):', receiverPharmacyId);
      
      if (!receiverPharmacyId) {
        console.error('Invalid pharmacy ID:', pharmacy.id);
        alert('Geçersiz eczane ID. Lütfen sayfayı yenileyin.');
        return;
      }

      console.log('[handleStartChat] Making API call with receiverPharmacyId:', receiverPharmacyId);

      const response = await fetch(`${API_BASE_URL}/api/chat/conversations`, { 
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        // Send as STRING to prevent JavaScript precision loss
        body: JSON.stringify({ receiverPharmacyId: receiverPharmacyId }),
      });


      console.log('[handleStartChat] Response status:', response.status);

      if (response.ok) {
        const conversation = await response.json();
        console.log('[handleStartChat] Conversation created:', conversation);
        
        // Open floating chat window instead of inline panel
        openFloatingChat(receiverPharmacyId);
        setShowNotificationsPanel(false);
        setShowCartPanel(false);
      } else {
        const errorText = await response.text();
        console.error('Failed to start chat:', response.status, errorText);
        alert(`Sohbet başlatılamadı: ${response.status}\n${errorText.substring(0, 200)}`);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  }, [token]);

  const closeNotificationModal = useCallback(() => setSelectedNotification(null), []);
  
  const closeChatWindow = useCallback(() => setSelectedChat(null), []);

  const unreadNotificationCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  // REMOVED: unreadMessageCount - now managed by ChatContext

  return useMemo(() => ({
    notifications,
    selectedNotification,
    messages,
    selectedChat,
    showNotificationsPanel,
    showMessagesPanel,
    showCartPanel,
    // Floating chat windows
    openChats,
    minimizedChats,
    handleLogout,
    handleNotificationClick,
    markAllNotificationsAsRead,
    handleMessageClick,
    toggleNotificationsPanel,
    toggleMessagesPanel,
    toggleCartPanel,
    closeNotificationModal,
    closeChatWindow,
    unreadNotificationCount,
    activeChatUserId,
    setActiveChatUserId,
    handleStartChat,
    // Floating window functions
    openFloatingChat,
    closeChat,
    toggleMinimizeChat,
  }), [
    notifications,
    selectedNotification,
    messages,
    selectedChat,
    showNotificationsPanel,
    showMessagesPanel,
    showCartPanel,
    openChats,
    minimizedChats,
    handleLogout,
    handleNotificationClick,
    markAllNotificationsAsRead,
    handleMessageClick,
    toggleNotificationsPanel,
    toggleMessagesPanel,
    toggleCartPanel,
    closeNotificationModal,
    closeChatWindow,
    unreadNotificationCount,
    activeChatUserId,
    setActiveChatUserId,
    handleStartChat,
    openFloatingChat,
    closeChat,
    toggleMinimizeChat,
  ]);
};