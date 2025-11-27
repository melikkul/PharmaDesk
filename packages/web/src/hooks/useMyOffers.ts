import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offerService } from '../services/offerService';
import { useAuth } from '../store/AuthContext';

/**
 * Hook for fetching current user's offers
 * 
 * Features:
 * - Automatic caching with 1-minute stale time
 * - Token-aware (auto-refetch when token changes)
 * - Background revalidation
 * - Manual refetch support
 * 
 * @returns {offers, loading, error, refreshOffers}
 */
export const useMyOffers = () => {
  const { token } = useAuth();

  const query = useQuery({
    queryKey: ['offers', 'my-offers', token],
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');
      return await offerService.getMyOffers(token);
    },
    enabled: !!token, // Only run when token exists
    staleTime: 30 * 1000, // 30 seconds for dynamic user data
  });

  return {
    offers: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refreshOffers: query.refetch,
  };
};
