import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { medicationService } from '../services/medicationService';
import { Medication } from '../types';

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
        const data: any = await medicationService.getMedications(token);
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
