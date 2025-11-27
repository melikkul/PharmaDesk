const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export const inventoryService = {
  /**
   * Get user's inventory
   */
  getMyInventory: async (token: string) => {
    const response = await fetch(`${API_BASE_URL}/api/inventory/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
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
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
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
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
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
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
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
