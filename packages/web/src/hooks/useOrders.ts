import { useQuery } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { useAuth } from '../store/AuthContext';

/**
 * Hook for fetching orders
 * 
 * @param type - 'buyer' for incoming orders, 'seller' for outgoing orders, undefined for all
 * @returns {orders, loading, error}
 */
export const useOrders = (type?: 'buyer' | 'seller') => {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: ['orders', type, token],
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');
      return await orderService.getOrders(token, type);
    },
    enabled: !!token,
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    orders: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
  };
};
