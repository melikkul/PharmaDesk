import { useState, useEffect } from 'react';
import { notificationService } from '../services/notificationService';
import { Notification } from '../types';

export function useNotifications(token: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await notificationService.getNotifications(token);
      setNotifications(data);
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!token) return;

    try {
      const count = await notificationService.getUnreadCount(token);
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  const markAsRead = async (id: number) => {
    if (!token) return;

    try {
      await notificationService.markAsRead(token, id);
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!token) return;

    try {
      await notificationService.markAllAsRead(token);
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [token]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
