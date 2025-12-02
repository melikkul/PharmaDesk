
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

import { Shipment } from '../types';

export const shipmentService = {
  getShipments: async (token: string, groupId?: number): Promise<Shipment[]> => {
    let url = `${API_BASE_URL}/api/shipments`;
    
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
      throw new Error('Failed to fetch shipments');
    }

    return response.json();
  }
};
