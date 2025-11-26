import { useState, useEffect } from 'react';
import { offerService } from '../services/offerService';
import { Offer } from '../types';

export const useOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const random = Math.random();
      const data: any = await offerService.getOffers(random);
      console.log('[useOffers] Fetched offers data:', data);
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
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    const fetchOffer = async () => {
      try {
        setLoading(true);
        const data: any = await offerService.getOfferById(id.toString());
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
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!medicationId) return;

    const fetchOffers = async () => {
      try {
        setLoading(true);
        const data: any = await offerService.getOffersByMedication(medicationId.toString());
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
