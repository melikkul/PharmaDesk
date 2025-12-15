
const API_BASE_URL = '';

import { DashboardStats } from '../types';

export const dashboardService = {
  getStats: async (token: string, groupId?: number | null): Promise<DashboardStats> => {
    let url = `${API_BASE_URL}/api/dashboard/stats`;
    
    // Add groupId if provided
    if (groupId) {
      url += `?groupId=${groupId}`;
    }

    const response = await fetch(url, {
      credentials: 'include',
      headers: token && token !== 'cookie-managed' 
        ? { 'Authorization': `Bearer ${token}` }
        : {}
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats');
    }

    return response.json();
  }
};
