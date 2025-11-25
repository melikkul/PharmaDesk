import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PharmacySettings } from '../data/dashboardData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export const useSettings = () => {
  const [settings, setSettings] = useState<PharmacySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  const fetchSettings = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Ayarlar yüklenemedi');
      }

      const data = await response.json();
      setSettings(data);
    } catch (err) {
      console.error('Settings fetch error:', err);
      setError('Ayarlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updatedSettings: Partial<PharmacySettings>) => {
    if (!token) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });

      if (!response.ok) {
        throw new Error('Ayarlar kaydedilemedi');
      }

      const data = await response.json();
      setSettings(data);
      return true;
    } catch (err) {
      console.error('Settings update error:', err);
      setError('Ayarlar kaydedilirken hata oluştu');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSettings();
    }
  }, [token]);

  return {
    settings,
    loading,
    error,
    updateSettings,
    refreshSettings: fetchSettings,
  };
};
