import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

// Backend DTO yapısına uygun interface
export interface MyOffer {
  id: number;
  productName: string;
  barcode?: string; // Barkod
  stock: string; // "50 + 5" formatında
  price: number;
  status: string;
  pharmacyName: string;
  pharmacyUsername: string;
  expirationDate?: string; // SKT - "MM/yyyy" formatında
}

export const useMyOffers = () => {
  const [offers, setOffers] = useState<MyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  const fetchOffers = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/offers/my-offers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[useMyOffers] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useMyOffers] API Error:', response.status, errorText);
        throw new Error('Teklifler yüklenemedi');
      }

      const data = await response.json();
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

