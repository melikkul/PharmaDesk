// src/hooks/useDashboardPanels.ts
'use client';

// ### OPTİMİZASYON: useMemo ve useCallback import edildi ###
import { useState, createContext, useContext, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
// GÜNCELLEME: Tipleri data dosyasından import ediyoruz
import { 
  initialNotifications, 
  initialMessages,
  type Notification as TNotification, 
  type Message as TMessage,
  type PharmacyProfileData
} from '@/data/dashboardData';

// Tipleri dışa aktar
import { SelectedNotification } from '@/context/DashboardContext';
export type Notification = TNotification;
export type Message = TMessage;

// 1. ADIM: Context ve Tipler artık context/DashboardContext.tsx dosyasında

// 3. ADIM: Hook'umuzu güncelleyelim
export const useDashboardPanels = () => {
  const router = useRouter();

  const [notifications, setNotifications] = useState<TNotification[]>(initialNotifications);
  const [selectedNotification, setSelectedNotification] = useState<SelectedNotification | null>(null);
  
  const [messages, setMessages] = useState<TMessage[]>(initialMessages);
  const [selectedChat, setSelectedChat] = useState<TMessage | null>(null);

  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = useState(false);
  const [showCartPanel, setShowCartPanel] = useState(false);

  // ### OPTİMİZASYON: useCallback ###
  // Fonksiyonun gereksiz yere yeniden oluşturulmasını engeller.
  const handleLogout = useCallback(() => {
    if (window.confirm("Çıkış yapmak istediğinizden emin misiniz?")) {
      router.push('/anasayfa');
    }
  }, [router]); // router bağımlılığı eklendi

  // ### OPTİMİZASYON: useCallback ###
  const toggleNotificationsPanel = useCallback(() => {
      setShowNotificationsPanel(p => !p);
      setShowMessagesPanel(false);
      setShowCartPanel(false);
  }, []); // Bağımlılığı yok

  // ### OPTİMİZASYON: useCallback ###
  const toggleMessagesPanel = useCallback(() => {
      setShowMessagesPanel(p => !p);
      setShowNotificationsPanel(false);
      setShowCartPanel(false);
  }, []); // Bağımlılığı yok
  
  // ### OPTİMİZASYON: useCallback ###
  const toggleCartPanel = useCallback(() => {
      setShowCartPanel(p => !p);
      setShowNotificationsPanel(false);
      setShowMessagesPanel(false);
  }, []); // Bağımlılığı yok

  // ### OPTİMİZASYON: useCallback ###
  const handleNotificationClick = useCallback((notification: TNotification) => {
    setSelectedNotification(notification);
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
    setShowNotificationsPanel(false);
  }, []); // Bağımlılığı yok

  // ### OPTİMİZASYON: useCallback ###
  const markAllNotificationsAsRead = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []); // Bağımlılığı yok

  // ### OPTİMİZASYON: useCallback ###
  const handleMessageClick = useCallback((message: TMessage) => {
    setSelectedChat(message);
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, read: true } : m));
    setShowMessagesPanel(false);
  }, []); // Bağımlılığı yok

  // ### OPTİMİZASYON: useCallback ###
  const markAllMessagesAsRead = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      setMessages(prev => prev.map(m => ({ ...m, read: true })));
  }, []); // Bağımlılığı yok
  
  // 4. ADIM: YENİ SOHBET BAŞLATMA FONKSİYONU (GÜNCELLENDİ)
  // ### OPTİMİZASYON: useCallback ###
  const handleStartChat = useCallback((pharmacy: PharmacyProfileData) => {
    // Eczane verisinden bir Mesaj objesi oluştur
    const chatData: TMessage = {
      id: 0, // Geçici ID
      idFromProfile: pharmacy.username,
      sender: pharmacy.pharmacyName,
      lastMessage: `Sorumlu: ${pharmacy.pharmacistInCharge}`,
      avatar: pharmacy.logoUrl,
      read: true
    };
    
    // State'leri güncelle
    setSelectedChat(chatData); // Sadece bu state'i set ediyoruz
    setShowMessagesPanel(false); 
    setShowNotificationsPanel(false); // Diğerlerini kapat
    setShowCartPanel(false);
  }, []); // Bağımlılığı yok

  // ### OPTİMİZASYON: useCallback ###
  const closeNotificationModal = useCallback(() => setSelectedNotification(null), []);
  
  // ### OPTİMİZASYON: useCallback ###
  const closeChatWindow = useCallback(() => setSelectedChat(null), []);

  // ### OPTİMİZASYON: useMemo ###
  // Bu değerler 'notifications' ve 'messages' state'lerine bağlı.
  const unreadNotificationCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  const unreadMessageCount = useMemo(() => messages.filter(m => !m.read).length, [messages]);

  // 5. ADIM: Tüm değerleri ve yeni fonksiyonu döndür
  // ### OPTİMİZASYON: useMemo ###
  // Hook'un döndürdüğü ana obje memoize edildi.
  // Sadece içindeki bir değer (state veya memoize edilmiş fonksiyon) değişirse
  // bu objenin referansı değişir. Bu, context tüketicilerinde gereksiz render'ları engeller.
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
    unreadMessageCount,
    closeNotificationModal,
    closeChatWindow,
    handleStartChat 
  }), [
    notifications, selectedNotification, messages, selectedChat,
    showNotificationsPanel, showMessagesPanel, showCartPanel,
    handleLogout, handleNotificationClick, markAllNotificationsAsRead,
    handleMessageClick, markAllMessagesAsRead, toggleNotificationsPanel,
    toggleMessagesPanel, toggleCartPanel, unreadNotificationCount,
    unreadMessageCount, closeNotificationModal, closeChatWindow, handleStartChat
  ]);
};