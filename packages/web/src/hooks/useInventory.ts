import { useQuery } from '@tanstack/react-query';
import { inventoryService } from '../services/inventoryService';
import { useAuth } from '../store/AuthContext';

/**
 * Hook for fetching user's inventory
 * 
 * Features:
 * - Token-aware queries
 * - Automatic caching with 30s stale time
 * - Background revalidation
 * 
 * @returns {inventory, loading, error}
 */
export const useInventory = () => {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: ['inventory', 'me', token],
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');
      return await inventoryService.getMyInventory(token);
    },
    enabled: !!token,
    staleTime: 30 * 1000, // 30 seconds for inventory data
  });

  return {
    inventory: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
  };
};
