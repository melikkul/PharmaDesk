import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { orderService } from '../services/orderService';
import { Order } from '../types';

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
        const data = await orderService.getOrders(token, type);
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
        const data = await orderService.getOrderById(token, orderId);
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
