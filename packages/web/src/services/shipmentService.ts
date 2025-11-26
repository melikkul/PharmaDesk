
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

import { Shipment } from '../types';

export const shipmentService = {
  getShipments: async (token: string): Promise<Shipment[]> => {
    const response = await fetch(`${API_BASE_URL}/api/shipments`, {
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
