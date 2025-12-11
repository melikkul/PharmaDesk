import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../store/AuthContext';
import { useGroup } from '../store/GroupContext';
import { dashboardService } from '../services/dashboardService';
import { DashboardStats } from '../types';

export interface DashboardData {
  stats: DashboardStats;
  recentOffers: any[];
  balanceHistory: any[];
  transfers: any[];
  shipments: any[];
}

/**
 * Hook for fetching dashboard statistics
 * 
 * Features:
 * - Automatic caching with 30-second stale time
 * - Query is disabled when no token is available
 * - Auto-refetches when token or activeGroupId changes
 * - Group-based filtering for transfers and shipments
 * 
 * @returns {data, loading, error}
 */
export const useDashboard = () => {
  const { token } = useAuth();
  const { activeGroupId } = useGroup();

  const query = useQuery({
    queryKey: ['dashboard', 'stats', token, activeGroupId],
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');

      const result: any = await dashboardService.getStats(token, activeGroupId);
      console.log('[useDashboard] API Result with groupId:', activeGroupId, result);

      // Manual mapping to ensure correct casing
      if (result.recentOffers) {
        result.recentOffers = result.recentOffers.map((offer: any) => ({
          ...offer,
          productName: offer.productName || offer.ProductName || 'İsimsiz Ürün',
          stock: offer.stock || offer.Stock,
          price: offer.price || offer.Price,
          imageUrl: offer.imageUrl || offer.ImageUrl,
          status: (offer.status || offer.Status || '').toLowerCase(),
        }));
      }

      return result;
    },
    enabled: !!token && activeGroupId !== null, // Only run when token and groupId exist
    staleTime: 30 * 1000, // Dashboard data is more dynamic, 30 second stale time
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
  };
};
