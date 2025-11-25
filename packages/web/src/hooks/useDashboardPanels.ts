// src/hooks/useDashboardPanels.ts
'use client';

import { useState, useCallback, useMemo } from 'react';
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
  const [activeChatUserId, setActiveChatUserId] = useState<number | null>(null);

  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);
  const [showCartPanel, setShowCartPanel] = useState(false);

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
      
      // Parse pharmacy ID to number
      const receiverPharmacyId = typeof pharmacy.id === 'string' ? parseInt(pharmacy.id, 10) : pharmacy.id;
      
      console.log('[handleStartChat] Pharmacy object:', pharmacy);
      console.log('[handleStartChat] pharmacy.id (raw):', pharmacy.id);
      console.log('[handleStartChat] receiverPharmacyId (parsed):', receiverPharmacyId);
      
      if (!receiverPharmacyId || isNaN(receiverPharmacyId)) {
        console.error('Invalid pharmacy ID:', pharmacy.id);
        alert('Geçersiz eczane ID. Lütfen sayfayı yenileyin.');
        return;
      }

      console.log('[handleStartChat] Making API call with receiverPharmacyId:', receiverPharmacyId);

      const response = await fetch(`${API_BASE_URL}/api/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiverPharmacyId }),
      });

      console.log('[handleStartChat] Response status:', response.status);

      if (response.ok) {
        const conversation = await response.json();
        console.log('[handleStartChat] Conversation created:', conversation);
        
        const chatData: TMessage = {
          id: conversation.id,
          idFromProfile: pharmacy.username,
          sender: pharmacy.pharmacyName,
          lastMessage: '', 
          avatar: pharmacy.logoUrl,
          read: true
        };
        
        setActiveChatUserId(receiverPharmacyId);
        setShowMessagesPanel(true); 
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
    handleLogout,
    handleNotificationClick,
    markAllNotificationsAsRead,
    handleMessageClick,
    markAllMessagesAsRead,
    toggleNotificationsPanel,
    toggleMessagesPanel,
    toggleCartPanel,
    unreadNotificationCount,
    unreadMessageCount: 0, // Placeholder - actual value from ChatContext in Header
    closeNotificationModal,
    closeChatWindow,
    handleStartChat,
    activeChatUserId,
    setActiveChatUserId 
  }), [
    notifications, selectedNotification, messages, selectedChat,
    showNotificationsPanel, showMessagesPanel, showCartPanel,
    handleLogout, handleNotificationClick, markAllNotificationsAsRead,
    handleMessageClick, markAllMessagesAsRead, toggleNotificationsPanel,
    toggleMessagesPanel, toggleCartPanel, unreadNotificationCount,
    closeNotificationModal, closeChatWindow, handleStartChat
  ]);
};