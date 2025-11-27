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
        // Silently return empty array - non-critical feature
        return [];
      }

      return response.json();
    } catch (error) {
      // Network error or other issues - return empty array gracefully
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
        // Silently return 0 - non-critical feature
        return 0;
      }

      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      // Network error or other issues - return 0 gracefully
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
