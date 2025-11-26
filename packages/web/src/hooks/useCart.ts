import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { cartService } from '../services/cartService';
import { Cart } from '../types';

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
      const data = await cartService.getCart(token);
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
      await cartService.addToCart(token, offerId, quantity);
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
      await cartService.updateQuantity(token, cartItemId, quantity);
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
      await cartService.removeFromCart(token, cartItemId);
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

  const cartItemCount = cart?.items?.length || 0;

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
