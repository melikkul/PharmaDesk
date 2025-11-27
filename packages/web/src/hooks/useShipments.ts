import { useQuery } from '@tanstack/react-query';
import { shipmentService } from '../services/shipmentService';
import { useAuth } from '../store/AuthContext';

/**
 * Hook for fetching shipments/transfers
 * 
 * @returns {shipments, loading, error}
 */
export const useShipments = () => {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: ['shipments', token],
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');
      return await shipmentService.getShipments(token);
    },
    enabled: !!token,
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    shipments: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
  };
};
