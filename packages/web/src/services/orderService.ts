
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

import { Order, OrderItem } from '../types';

export const orderService = {
  getOrders: async (token: string, type?: 'buyer' | 'seller'): Promise<Order[]> => {
    const url = type 
      ? `${API_BASE_URL}/api/orders?type=${type}`
      : `${API_BASE_URL}/api/orders`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[orderService ${type || 'all'}] API Error:`, response.status, errorText);
      throw new Error('Siparişler yüklenemedi');
    }

    return response.json();
  },

  getOrderById: async (token: string, orderId: string): Promise<Order> => {
    const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Sipariş yüklenemedi');
    }

    return response.json();
  }
};
