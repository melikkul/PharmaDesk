import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export interface Medication {
  id: number;
  name: string;
  atcCode: string;
  manufacturer?: string;
  barcode?: string;
  description?: string;
  packageType?: string;
  basePrice: number;
  imageUrl?: string;
}

export const useMedications = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchMedications = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/medications`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('İlaçlar yüklenemedi');
        }

        const data = await response.json();
        setMedications(data);
      } catch (err) {
        console.error('Medications error:', err);
        setError('İlaçlar yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchMedications();
  }, [token]);

  return { medications, loading, error };
};
