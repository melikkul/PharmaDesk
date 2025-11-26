
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

import { Notification } from '../types';

export const notificationService = {
  getNotifications: async (token: string): Promise<Notification[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Return empty array instead of throwing error
        console.warn('Unable to fetch notifications:', response.status);
        return [];
      }

      return response.json();
    } catch (error) {
      // Network error or other issues - return empty array gracefully
      console.warn('Error fetching notifications:', error);
      return [];
    }
  },

  getUnreadCount: async (token: string): Promise<number> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Return 0 instead of throwing error to avoid console errors
        console.warn('Unable to fetch unread count:', response.status);
        return 0;
      }

      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      // Network error or other issues - return 0 gracefully
      console.warn('Error fetching unread count:', error);
      return 0;
    }
  },

  markAsRead: async (token: string, id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to mark notification as read');
    }
  },

  markAllAsRead: async (token: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read');
    }
  }
};
