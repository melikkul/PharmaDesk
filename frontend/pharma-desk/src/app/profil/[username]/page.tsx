'use client'

import React from 'react';
import { useRouter, useParams } from 'next/navigation';

// Veri ve Bileşenleri import ediyoruz
import { pharmacyData, initialNotifications, initialMessages, userMedicationsData } from '../../../data/dashboardData';
import Sidebar from '../../../components/Sidebar';
import Header from '../../../components/Header';
import ProfileHeader from '../../../components/profile/ProfileHeader';
import ProfileDetails from '../../../components/profile/ProfileDetails';
import ProfileMedications from '../../../components/profile/ProfileMedications';
import SlidePanel from '../../../components/ui/SlidePanel';
import NotificationItem from '../../../components/notifications/NotificationItem';
import MessageItem from '../../../components/notifications/MessageItem';
import NotificationModal from '../../../components/notifications/NotificationModal';
import ChatWindow from '../../../components/chat/ChatWindow';

// Stil dosyalarını import ediyoruz
import '../../dashboard/dashboard.css';
import styles from './profile.module.css';

// Tipleri tanımlıyoruz
type Notification = typeof initialNotifications[0];
type Message = typeof initialMessages[0];
interface SelectedNotification extends Omit<Notification, 'read'> {
  detail?: string;
}

const getPharmacyData = (username: string | string[]) => {
  if (typeof username === 'string' && username === pharmacyData.username) {
    return pharmacyData;
  }
  return null;
};

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const pharmacy = getPharmacyData(params.username);
  const router = useRouter();

  // State yönetimi ve fonksiyonlar aynı kalıyor...
  const [notifications, setNotifications] = React.useState<Notification[]>(initialNotifications);
  const [selectedNotification, setSelectedNotification] = React.useState<SelectedNotification | null>(null);
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [selectedChat, setSelectedChat] = React.useState<Message | null>(null);
  const [showNotificationsPanel, setShowNotificationsPanel] = React.useState(false);
  const [showMessagesPanel, setShowMessagesPanel] = React.useState(false);

  const handleLogout = () => {
    if (window.confirm("Çıkış yapmak istediğinizden emin misiniz?")) {
      router.push('/anasayfa');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
    setShowNotificationsPanel(false);
  };

  const markAllNotificationsAsRead = (e: React.MouseEvent) => {
      e.preventDefault();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

   const handleMessageClick = (message: Message) => {
    setSelectedChat(message);
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, read: true } : m));
    setShowMessagesPanel(false);
  };

   const markAllMessagesAsRead = (e: React.MouseEvent) => {
      e.preventDefault();
      setMessages(prev => prev.map(m => ({ ...m, read: true })));
  };

  const toggleNotificationsPanel = () => {
      setShowNotificationsPanel(!showNotificationsPanel);
      setShowMessagesPanel(false);
  }

  const toggleMessagesPanel = () => {
      setShowMessagesPanel(!showMessagesPanel);
      setShowNotificationsPanel(false);
  }
  
  const unreadNotificationCount = notifications.filter(n => !n.read).length;
  const unreadMessageCount = messages.filter(m => !m.read).length;

  if (!pharmacy) {
    return <div><p>Eczane profili bulunamadı.</p></div>;
  }

  const isOwnProfile = params.username === pharmacyData.username;

  return (
    <div className="dashboard-container">
      <Sidebar />
      <Header
        userData={pharmacyData}
        onMessageClick={toggleMessagesPanel}
        onNotificationClick={toggleNotificationsPanel}
        unreadNotificationCount={unreadNotificationCount}
        unreadMessageCount={unreadMessageCount}
        onLogout={handleLogout}
      />
      <main className="main-content">
        <div className={styles.profileContainer}>
          <ProfileHeader pharmacy={pharmacy} isOwnProfile={isOwnProfile} />
          <div className={styles.profileBody}>
            <div className={styles.detailsRow}>
              <ProfileDetails pharmacy={pharmacy} isOwnProfile={isOwnProfile} />
            </div>
            <div className={styles.medicationsRow}>
              <ProfileMedications data={userMedicationsData} />
            </div>
          </div>
        </div>
      </main>
      
      {/* Açılır paneller ve modallar aynı kalıyor */}
      <SlidePanel title="Bildirimler" show={showNotificationsPanel} onClose={() => setShowNotificationsPanel(false)} onMarkAllRead={markAllNotificationsAsRead}>
          {notifications.map(notif => <NotificationItem key={notif.id} item={notif} onClick={handleNotificationClick} />)}
      </SlidePanel>
      <SlidePanel title="Mesajlar" show={showMessagesPanel} onClose={() => setShowMessagesPanel(false)} onMarkAllRead={markAllMessagesAsRead}>
          {messages.map(msg => <MessageItem key={msg.id} item={msg} onClick={handleMessageClick} />)}
      </SlidePanel>
      <NotificationModal notification={selectedNotification} onClose={() => setSelectedNotification(null)} />
      <ChatWindow chat={selectedChat} onClose={() => setSelectedChat(null)} />
    </div>
  );
}