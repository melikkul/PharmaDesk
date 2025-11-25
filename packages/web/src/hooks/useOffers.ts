import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export interface OfferDto {
  id: number;
  medicationId: number;
  productName: string;
  barcode?: string;
  type: 'standard' | 'campaign' | 'tender';
  stock: string;
  price: number;
  status: string;
  pharmacyId: string;
  pharmacyName: string;
  pharmacyUsername: string;
  description?: string;
  manufacturer?: string;
  imageUrl?: string;
  expirationDate?: string;
  campaignEndDate?: string;
  campaignBonusMultiplier?: number;
  minimumOrderQuantity?: number;
  biddingDeadline?: string;
}

export const useOffers = () => {
  const [offers, setOffers] = useState<OfferDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      // Add cache: 'no-store' to prevent caching
      // Also add random query param to force browser to fetch fresh data
      const random = Math.random();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/offers?_=${random}`, { 
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Teklifler yüklenemedi');
      const data = await response.json();
      console.log('[useOffers] Fetched offers data:', data); // Debug log
      setOffers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  return { offers, loading, error, refetch: fetchOffers };
};

export const useOffer = (id: string | number) => {
  const [offer, setOffer] = useState<OfferDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchOffer = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/offers/${id}`);
        if (!response.ok) throw new Error('Teklif bulunamadı');
        const data = await response.json();
        setOffer(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();
  }, [id]);

  return { offer, loading, error };
};

export const useMedicationOffers = (medicationId: string | number) => {
  const [offers, setOffers] = useState<OfferDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!medicationId) return;

    const fetchOffers = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/offers/medication/${medicationId}`);
        if (!response.ok) throw new Error('Teklifler bulunamadı');
        const data = await response.json();
        setOffers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [medicationId]);

  return { offers, loading, error };
};
