
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

import { Medication, InventoryItem } from '../types';

export const medicationService = {
  getMedications: async (token: string): Promise<Medication[]> => {
    const response = await fetch(`${API_BASE_URL}/api/medications`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch medications');
    }

    return response.json();
  },

  searchMedications: async (query: string, limit: number = 10): Promise<Medication[]> => {
    const response = await fetch(`${API_BASE_URL}/api/medications/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error('Failed to search medications');
    }

    return response.json();
  },

  getMyInventory: async (token: string): Promise<InventoryItem[]> => {
    const response = await fetch(`${API_BASE_URL}/api/inventory/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch inventory');
    }

    return response.json();
  }
};
