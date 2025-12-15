
const API_BASE_URL = '';

import { Medication, InventoryItem } from '../types';

// Barem response types from Alliance Healthcare API
export interface BaremInfo {
  warehouseId: number;
  warehouseName: string;
  vade: number;
  minimumAdet: number;
  malFazlasi: string;
  iskontoKurum: number;
  iskontoTicari: number;
  birimFiyat: number;
  discountPercentage: number;
  maxPrice: number;
  minQuantity: number;
  bonusQuantity: number;
  baremType: string;
}

export interface BaremResponse {
  id: number;
  externalApiId: number | null;
  name: string | null;
  barcode: string | null;
  manufacturer: string | null;
  basePrice: number;
  packageType: string | null;
  alternatives: string[];
  barems: BaremInfo[];
  baremFetchedAt: string | null;
  baremError: string | null;
}

export const medicationService = {
  getMedications: async (token: string): Promise<Medication[]> => {
    const response = await fetch(`${API_BASE_URL}/api/medications`, {
      credentials: 'include',
      headers: {
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
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

  /**
   * Fetch barem/discount data for a medication from Alliance Healthcare
   * Returns real-time pricing and discount information
   */
  getMedicationBarem: async (medicationId: number): Promise<BaremResponse | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/medications/${medicationId}/barem`);
      
      if (!response.ok) {
        console.warn(`Failed to fetch barem for medication ${medicationId}: ${response.status}`);
        return null;
      }

      return response.json();
    } catch (error) {
      console.error('Error fetching medication barem:', error);
      return null;
    }
  },

  getMyInventory: async (token: string): Promise<InventoryItem[]> => {
    const response = await fetch(`${API_BASE_URL}/api/inventory/me`, {
      credentials: 'include',
      headers: {
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch inventory');
    }

    return response.json();
  }
};
