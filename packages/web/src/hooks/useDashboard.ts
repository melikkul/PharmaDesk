import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { dashboardService } from '../services/dashboardService';
import { DashboardStats } from '../types';

export interface DashboardData {
  stats: DashboardStats;
  recentOffers: any[];
  balanceHistory: any[];
  transfers: any[];
  shipments: any[];
}

export const useDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const result: any = await dashboardService.getStats(token);
        console.log('Dashboard API Result:', result);

        // Manual mapping to ensure correct casing
        if (result.recentOffers) {
            result.recentOffers = result.recentOffers.map((offer: any) => ({
                ...offer,
                productName: offer.productName || offer.ProductName || 'İsimsiz Ürün',
                stock: offer.stock || offer.Stock,
                price: offer.price || offer.Price,
                status: (offer.status || offer.Status || '').toLowerCase(),
            }));
        }

        setData(result);
      } catch (err) {
        console.error(err);
        setError('Veriler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  return { data, loading, error };
};
