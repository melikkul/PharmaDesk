import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Cart, CartItem } from '../data/dashboardData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export const useCart = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  // Fetch cart
  const fetchCart = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/carts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch cart');
      }

      const data = await response.json();
      setCart(data);
    } catch (err) {
      console.error('Cart fetch error:', err);
      setError('Sepet yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Add  item to cart
  const addToCart = async (offerId: number, quantity: number) => {
    if (!token) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/carts/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ offerId, quantity }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add item');
      }

      await fetchCart(); // Refresh cart
      return true;
    } catch (err: any) {
      console.error('Add to cart error:', err);
      setError(err.message || 'Sepete eklenirken hata oluştu');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update item quantity
  const updateQuantity = async (cartItemId: number, quantity: number) => {
    if (!token) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/carts/items/${cartItemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) {
        throw new Error('Failed to update quantity');
      }

      await fetchCart(); // Refresh cart
      return true;
    } catch (err) {
      console.error('Update quantity error:', err);
      setError('Miktar güncellenirken hata oluştu');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Remove item from cart
  const removeItem = async (cartItemId: number) => {
    if (!token) return false;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/carts/items/${cartItemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove item');
      }

      await fetchCart(); // Refresh cart
      return true;
    } catch (err) {
      console.error('Remove item error:', err);
      setError('Ürün silinirken hata oluştu');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Load cart on mount
  useEffect(() => {
    if (token) {
      fetchCart();
    }
  }, [token]);

  const cartItemCount = cart?.cartItems?.length || 0;

  return {
    cart,
    cartItemCount,
    loading,
    error,
    addToCart,
    updateQuantity,
    removeItem,
    refreshCart: fetchCart,
  };
};
