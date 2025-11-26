
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

import { PharmacyProfile, PharmacySettings } from '../types';

export const userService = {
  getProfile: async (token: string, userId?: string): Promise<PharmacyProfile> => {
    const endpoint = userId ? `/api/users/${userId}` : '/api/users/me';
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    return response.json();
  },

  updateProfile: async (token: string, data: Partial<PharmacyProfile>): Promise<PharmacyProfile> => {
    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    return response.json();
  },

  getSettings: async (token: string): Promise<PharmacySettings> => {
    const response = await fetch(`${API_BASE_URL}/api/settings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch settings');
    }

    return response.json();
  },

  updateSettings: async (token: string, settings: Partial<PharmacySettings>): Promise<PharmacySettings> => {
    const response = await fetch(`${API_BASE_URL}/api/settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error('Failed to update settings');
    }

    return response.json();
  }
};
