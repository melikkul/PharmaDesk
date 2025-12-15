
const API_BASE_URL = '';

// Backend CartItem response tipi
export interface BackendCartItem {
  id: number;
  cartId: number;
  offerId: number;
  quantity: number;
  addedAt: string;
  offer: {
    id: number;
    price: number;
    stock: number;
    bonusQuantity?: number; // 🆕 Barem bonus miktarı
    type: string | number; // 🆕 Backend may send numeric enum (0, 1, 2) or string
    pharmacyProfile: {
      id: number;
      pharmacyName: string;
      username: string;
    };
    medication: {
      id: number;
      name: string;
      imageUrl?: string;      // May be present
      imagePath?: string;     // Backend actual field name
      allImagePaths?: string | string[]; // JSON array or string
      manufacturer?: string;
    };
  };
}

export interface BackendCart {
  id: number;
  pharmacyProfileId: number;
  updatedAt: string;
  createdAt: string;
  cartItems: BackendCartItem[];
}

export interface StockLockStatus {
  myLocks: {
    offerId: number;
    lockedQuantity: number;
    expiresAt: string;
  }[];
  isLocked: boolean;
}

export interface LockResponse {
  message: string;
  lockedOfferIds: number[];
  expiresAt: string;
}

export const cartService = {
  getCart: async (token: string, signal?: AbortSignal): Promise<BackendCart> => {
    const response = await fetch(`${API_BASE_URL}/api/carts`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        },
      signal, // AbortSignal for cancellation
    });

    // 401 Unauthorized - kullanıcı giriş yapmamış veya token expired
    // Boş sepet dön, hata fırlatma
    if (response.status === 401) {
      console.warn('[cartService] Unauthorized - returning empty cart');
      return {
        id: 0,
        pharmacyProfileId: 0,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        cartItems: []
      };
    }

    if (!response.ok) {
      console.error('[cartService] Failed to fetch cart:', response.status, response.statusText);
      try {
        const text = await response.text();
        console.error('[cartService] Error details:', text);
      } catch (e) { /* ignore */ }
      throw new Error(`Failed to fetch cart: ${response.status}`);
    }

    return response.json();
  },

  addToCart: async (token: string, offerId: number, quantity: number): Promise<{ message: string; cartItemCount: number; adjustedQuantity?: number }> => {
    const response = await fetch(`${API_BASE_URL}/api/carts/items`, {
      method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        },
      body: JSON.stringify({ offerId, quantity }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to add to cart' }));
      throw new Error(error.message || 'Failed to add to cart');
    }

    return response.json();
  },

  removeFromCart: async (token: string, cartItemId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/carts/items/${cartItemId}`, {
      method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        },
    });

    if (!response.ok) {
      throw new Error('Failed to remove from cart');
    }
  },

  updateQuantity: async (token: string, cartItemId: number, quantity: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/carts/items/${cartItemId}`, {
      method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        },
      body: JSON.stringify({ quantity }),
    });

    if (!response.ok) {
      throw new Error('Failed to update quantity');
    }
  },

  clearCart: async (token: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/carts/clear`, {
      method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        },
    });

    if (!response.ok) {
      throw new Error('Failed to clear cart');
    }
  },

  // Stok kilitleme/serbest bırakma metodları
  lockStocks: async (token: string): Promise<LockResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/stocklocks/lock`, {
      method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to lock stocks' }));
      throw new Error(error.message || 'Failed to lock stocks');
    }

    return response.json();
  },

  unlockStocks: async (token: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/stocklocks/unlock`, {
      method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        },
    });

    if (!response.ok) {
      // Hata olsa bile sayfadan çıkarken sorun olmasın
      console.warn('Failed to unlock stocks');
    }
  },

  getLockStatus: async (token: string): Promise<StockLockStatus> => {
    const response = await fetch(`${API_BASE_URL}/api/stocklocks/status`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        },
    });

    if (!response.ok) {
      throw new Error('Failed to get lock status');
    }

    return response.json();
  },

  getOfferLockStatus: async (token: string, offerId: number): Promise<{
    totalLocked: number;
    myLocked: number;
    othersLocked: number;
  }> => {
    const response = await fetch(`${API_BASE_URL}/api/stocklocks/offer/${offerId}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        },
    });

    if (!response.ok) {
      throw new Error('Failed to get offer lock status');
    }

    return response.json();
  },

  setDepotFulfillment: async (token: string, cartItemId: number, isDepotFulfillment: boolean): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/carts/items/${cartItemId}/depot-fulfillment`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ isDepotFulfillment }),
    });

    if (!response.ok) {
      throw new Error('Failed to update depot fulfillment');
    }
  }
};
