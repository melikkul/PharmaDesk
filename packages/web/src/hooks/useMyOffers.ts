import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { offerService } from '../services/offerService';
import { Offer } from '../types';

export const useMyOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  const fetchOffers = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data: any = await offerService.getMyOffers(token);
      console.log('[useMyOffers] Data received:', data);
      setOffers(data);
    } catch (err) {
      console.error('Offers error:', err);
      setError('Teklifler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [token]);

  return { offers, loading, error, refreshOffers: fetchOffers };
};

