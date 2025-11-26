import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { userService } from '../services/userService';
import { PharmacySettings } from '../types';

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
      const data = await userService.getSettings(token);
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
      const data = await userService.updateSettings(token, updatedSettings);
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
