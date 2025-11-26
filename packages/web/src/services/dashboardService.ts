
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

import { DashboardStats } from '../types';

export const dashboardService = {
  getStats: async (token: string): Promise<DashboardStats> => {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats');
    }

    return response.json();
  }
};
