import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// Define types matching the card components' expectations
// We might need to import these types or define them here if they are not exported
// For now, using any[] or matching the structure from dashboardData.ts if possible
// But since we are removing dashboardData.ts, we should define them here or in a types file.

export interface DashboardData {
  stats: {
    totalInventory: number;
    totalMedications: number;
    activeOrders: number;
    activeOffers: number;
    totalSales: number;
  };
  recentOffers: any[];
  balanceHistory: any[];
  transfers: any[];
  shipments: any[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export const useDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats');
        }

        const result = await response.json();
        console.log('Dashboard API Result:', result); // Debug log

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

    if (token) {
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [token]);

  return { data, loading, error };
};
