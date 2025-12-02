import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export interface GroupMemberStatistics {
  groupName: string;
  district: string;
  pharmacyName: string;
  balance: number;
  groupLoad: number;
  purchaseCount: number;
  purchaseAmount: number;
  systemEarnings: number;
  offerCount: number;
  shipmentCount: number;
  shipmentAmount: number;
  groupContribution: number;
}

export interface GroupStatisticsFilters {
  pharmacyName?: string;
  district?: string;
  startDate?: string;
  endDate?: string;
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  cityId: number;
  cityName: string;
}

export const groupService = {
  async getMyGroupStatistics(filters: GroupStatisticsFilters = {}): Promise<GroupMemberStatistics[]> {
    const params = new URLSearchParams();
    
    if (filters.pharmacyName) params.append('pharmacyName', filters.pharmacyName);
    if (filters.district) params.append('district', filters.district);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const token = Cookies.get('token');
    const response = await fetch(`${API_BASE_URL}/api/groups/my-groups/statistics?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch group statistics: ${response.statusText}`);
    }
    
    return await response.json();
  },

  async getMyGroups(): Promise<Group[]> {
    const token = Cookies.get('token');
    const response = await fetch(`${API_BASE_URL}/api/groups/my-groups`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch groups: ${response.statusText}`);
    }
    
    return await response.json();
  }
};
