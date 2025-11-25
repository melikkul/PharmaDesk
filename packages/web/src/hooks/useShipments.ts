import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

// Backend ShipmentDto yapısına uygun interface
export interface Shipment {
  id: number;
  orderNumber: string;
  productName: string;
  quantity: number;
  trackingNumber: string;
  date: string;
  transferType: 'inbound' | 'outbound';
  counterparty: string;
  shippingProvider: string;
  status: string;
  trackingHistory: any[];
}

export const useShipments = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchShipments = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/shipments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('[useShipments] Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[useShipments] API Error:', response.status, errorText);
          throw new Error('Kargolar yüklenemedi');
        }

        const data = await response.json();
        console.log('[useShipments] Data received:', data);
        setShipments(data);
      } catch (err) {
        console.error('Shipments error:', err);
        setError('Kargolar yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, [token]);

  return { shipments, loading, error };
};
