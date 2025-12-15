const API_BASE_URL = '';

export const inventoryService = {
  /**
   * Get user's inventory
   */
  getMyInventory: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/inventory/me`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch inventory');
    }

    return response.json();
  },

  /**
   * Update inventory item (quantity, price, etc.)
   */
  updateItem: async (token: string, itemId: number, data: Partial<{
    quantity: number;
    bonusQuantity: number;
    costPrice: number;
    salePrice: number;
    minStockLevel: number;
    isAlarmSet: boolean;
  }>) => {
    const response = await fetch(`${API_BASE_URL}/api/inventory/${itemId}`, {
      method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Update failed' }));
      throw new Error(error.message || 'Failed to update inventory item');
    }

    return response.json();
  },

  /**
   * Delete inventory item
   */
  deleteItem: async (token: string, itemId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/inventory/${itemId}`, {
      method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Delete failed' }));
      throw new Error(error.message || 'Failed to delete inventory item');
    }

    return { success: true, itemId };
  },

  /**
   * Create new inventory item
   */
  createItem: async (token: string, data: {
    medicationId: number;
    quantity: number;
    bonusQuantity?: number;
    costPrice: number;
    salePrice?: number;
    expiryDate: string;
    batchNumber: string;
    shelfLocation?: string;
    minStockLevel?: number;
    isAlarmSet?: boolean;
  }) => {
    const response = await fetch(`${API_BASE_URL}/api/inventory`, {
      method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Create failed' }));
      throw new Error(error.message || 'Failed to create inventory item');
    }

    return response.json();
  },
};
