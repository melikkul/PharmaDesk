
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

import { Cart, CartItem } from '../types';

export const cartService = {
  getCart: async (token: string): Promise<Cart> => {
    const response = await fetch(`${API_BASE_URL}/api/carts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch cart');
    }

    return response.json();
  },

  addToCart: async (token: string, medicationId: number, quantity: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/carts/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ medicationId, quantity }),
    });

    if (!response.ok) {
      throw new Error('Failed to add to cart');
    }
  },

  removeFromCart: async (token: string, cartItemId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/carts/items/${cartItemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to remove from cart');
    }
  },

  updateQuantity: async (token: string, cartItemId: number, quantity: number): Promise<void> => {
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
  }
};
