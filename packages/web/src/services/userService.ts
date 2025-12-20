
const API_BASE_URL = '';

import { PharmacyProfile, PharmacySettings } from '../types';

export const userService = {
  getProfile: async (token: string, userId?: string): Promise<PharmacyProfile> => {
    const endpoint = userId ? `/api/users/${userId}` : '/api/users/me';
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      credentials: 'include',
      headers: {
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {}),
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
      credentials: 'include',
      headers: {
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    // Backend returns 204 No Content on success - don't try to parse empty body
    if (response.status === 204) {
      return data as PharmacyProfile;
    }

    return response.json();
  },

  changePassword: async (token: string, currentPassword: string, newPassword: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/users/me/password`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Şifre değiştirilemedi' }));
      throw new Error(error.message || 'Şifre değiştirilemedi');
    }
  },

  getSettings: async (token: string): Promise<PharmacySettings> => {
    const response = await fetch(`${API_BASE_URL}/api/settings`, {
      credentials: 'include',
      headers: {
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {}),
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
      credentials: 'include',
      headers: {
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {}),
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
