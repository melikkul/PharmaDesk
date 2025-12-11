
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

import { Order, OrderItem } from '../types';

export const orderService = {
  getOrders: async (token: string, type?: 'buyer' | 'seller', groupId?: number): Promise<Order[]> => {
    let url = type 
      ? `${API_BASE_URL}/api/orders?type=${type}`
      : `${API_BASE_URL}/api/orders`;
    
    // Add groupId if provided
    if (groupId) {
      url += type ? `&groupId=${groupId}` : `?groupId=${groupId}`;
    }

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

    const data = await response.json();
    
    // Transform backend flat response to frontend nested format
    return data.map((order: any) => ({
      ...order,
      // Map flat fields to nested objects expected by frontend
      sellerPharmacy: {
        id: order.sellerPharmacyId,
        pharmacyName: order.sellerPharmacyName || 'Bilinmiyor'
      },
      buyerPharmacy: {
        id: order.buyerPharmacyId,
        pharmacyName: order.buyerPharmacyName || 'Bilinmiyor'
      },
      // Map other fields
      orderDate: order.createdAt || order.orderDate,
      paymentStatus: order.paymentStatus || 'Pending',
      orderItems: order.items || order.orderItems || []
    }));
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

    const order = await response.json();
    
    // Transform backend flat response to frontend nested format
    return {
      ...order,
      sellerPharmacy: {
        id: order.sellerPharmacyId,
        pharmacyName: order.sellerPharmacyName || 'Bilinmiyor'
      },
      buyerPharmacy: {
        id: order.buyerPharmacyId,
        pharmacyName: order.buyerPharmacyName || 'Bilinmiyor'
      },
      orderDate: order.orderDate || order.createdAt,
      paymentStatus: order.paymentStatus || 'Pending',
      orderItems: order.items || order.orderItems || []
    };
  }
};
