import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { medicationService } from '../services/medicationService';

import { InventoryItem } from '../types';

export const useInventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchInventory = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data: any = await medicationService.getMyInventory(token);
        setInventory(data);
      } catch (err) {
        console.error('Inventory error:', err);
        setError('Envanter yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [token]);

  return { inventory, loading, error };
};
