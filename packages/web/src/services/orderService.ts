
const API_BASE_URL = '';

import { Order, OrderItem } from '../types';

export const orderService = {
  getOrders: async (token: string, type?: 'buyer' | 'seller', groupId?: number): Promise<Order[]> => {
    // Fix: Regular users should use 'my-orders' endpoint
    // Admin 'GetAllOrders' is at /api/orders (protected by Admin role)
    // 'GetMyOrders' is /api/orders/my-orders (protected by checks inside)
    let url = type 
      ? `${API_BASE_URL}/api/orders/my-orders?role=${type}`
      : `${API_BASE_URL}/api/orders/my-orders`;
    
    // Add groupId if provided
    if (groupId) {
      url += type ? `&groupId=${groupId}` : `?groupId=${groupId}`;
    }

    const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
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
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
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
