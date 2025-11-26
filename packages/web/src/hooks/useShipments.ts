import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { shipmentService } from '../services/shipmentService';
import { Shipment } from '../types';

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
        const data: any = await shipmentService.getShipments(token);
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
