
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

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
    type: string; // 'StockSale' | 'JointOrder' | 'PurchaseRequest'
    pharmacyProfile: {
      id: number;
      pharmacyName: string;
      username: string;
    };
    medication: {
      id: number;
      name: string;
      imageUrl?: string;
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
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
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
      throw new Error('Failed to fetch cart');
    }

    return response.json();
  },

  addToCart: async (token: string, offerId: number, quantity: number): Promise<{ message: string; cartItemCount: number }> => {
    const response = await fetch(`${API_BASE_URL}/api/carts/items`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
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
  },

  clearCart: async (token: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/carts/clear`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
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
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
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
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Hata olsa bile sayfadan çıkarken sorun olmasın
      console.warn('Failed to unlock stocks');
    }
  },

  getLockStatus: async (token: string): Promise<StockLockStatus> => {
    const response = await fetch(`${API_BASE_URL}/api/stocklocks/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
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
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get offer lock status');
    }

    return response.json();
  }
};
