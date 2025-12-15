
const API_BASE_URL = '';

import { Shipment } from '../types';

export const shipmentService = {
  getShipments: async (token: string, groupId?: number): Promise<Shipment[]> => {
    let url = `${API_BASE_URL}/api/shipments`;
    
    // Add groupId if provided
    if (groupId) {
      url += `?groupId=${groupId}`;
    }

    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch shipments');
    }

    return response.json();
  }
};
