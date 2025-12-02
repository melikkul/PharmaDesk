
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

import { DashboardStats } from '../types';

export const dashboardService = {
  getStats: async (token: string, groupId?: number | null): Promise<DashboardStats> => {
    let url = `${API_BASE_URL}/api/dashboard/stats`;
    
    // Add groupId if provided
    if (groupId) {
      url += `?groupId=${groupId}`;
    }

    const response = await fetch(url, {
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
