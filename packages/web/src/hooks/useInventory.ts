import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export interface InventoryItem {
  id: number;
  medicationId: number;
  quantity: number;
  bonusQuantity: number;
  costPrice: number;
  salePrice?: number;
  expiryDate: string;
  batchNumber: string;
  shelfLocation?: string;
  isAlarmSet: boolean;
  minStockLevel?: number;
  medication: {
    id: number;
    name: string;
    barcode?: string;
    atcCode: string;
    basePrice: number;
  };
}

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
        const response = await fetch(`${API_BASE_URL}/api/inventory/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Envanter yüklenemedi');
        }

        const data = await response.json();
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
