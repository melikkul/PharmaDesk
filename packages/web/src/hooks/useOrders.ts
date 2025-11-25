import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export interface OrderItem {
  id: number;
  medicationId: number;
  quantity: number;
  unitPrice: number;
  bonusQuantity: number;
  medication: {
    id: number;
    name: string;
    atcCode: string;
  };
}

export interface Order {
  id: number;
  orderNumber: string;
  buyerPharmacyId: number;
  sellerPharmacyId: number;
  totalAmount: number;
  orderDate: string;
  status: string;
  paymentStatus: string;
  buyerPharmacy?: {
    id: number;
    pharmacyName: string;
  };
  sellerPharmacy?: {
    id: number;
    pharmacyName: string;
  };
  orderItems: OrderItem[];
}

export const useOrders = (type?: 'buyer' | 'seller') => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchOrders = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const url = type 
          ? `${API_BASE_URL}/api/orders?type=${type}`
          : `${API_BASE_URL}/api/orders`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log(`[useOrders ${type || 'all'}] Response status:`, response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[useOrders ${type || 'all'}] API Error:`, response.status, errorText);
          throw new Error('Siparişler yüklenemedi');
        }

        const data = await response.json();
        console.log(`[useOrders ${type || 'all'}] Data received:`, data);
        setOrders(data);
      } catch (err) {
        console.error('Orders error:', err);
        setError('Siparişler yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [token, type]);

  return { orders, loading, error };
};

// Single order hook for detail page
export const useOrder = (orderId: string) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchOrder = async () => {
      if (!token || !orderId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Sipariş yüklenemedi');
        }

        const data = await response.json();
        setOrder(data);
      } catch (err) {
        console.error('Order detail error:', err);
        setError('Sipariş detayı yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [token, orderId]);

  return { order, loading, error };
};
