import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../services/inventoryService';
import { useAuth } from '../store/AuthContext';
import { InventoryItem } from '../types';

/**
 * Hook for inventory management with Optimistic Updates
 * 
 * Features:
 * - Token-aware queries with automatic caching
 * - Optimistic updates for instant UI feedback
 * - Automatic rollback on errors
 * - Background revalidation
 * 
 * Optimistic Update Flow:
 * 1. onMutate: Cancel in-flight queries, save snapshot, update cache optimistically
 * 2. onError: Rollback to snapshot if mutation fails
 * 3. onSettled: Revalidate from server regardless of success/failure
 * 
 * @returns {inventory, mutations, loading, error}
 */
export const useInventory = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Query key for inventory
  const queryKey = ['inventory', 'me', token];

  // ============================================
  // QUERY: Fetch Inventory
  // ============================================
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');
      return await inventoryService.getMyInventory(token);
    },
    enabled: !!token,
    staleTime: 30 * 1000, // 30 seconds for inventory data
  });

  // ============================================
  // MUTATION: Update Item (Optimistic)
  // ============================================
  const updateItem = useMutation({
    mutationFn: async ({ itemId, data }: { 
      itemId: number; 
      data: Partial<InventoryItem> 
    }) => {
      if (!token) throw new Error('No authentication token');
      return inventoryService.updateItem(token, itemId, data);
    },

    // 1. OPTIMISTIC UPDATE: Update UI immediately
    onMutate: async ({ itemId, data }) => {
      // Cancel outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousInventory = queryClient.getQueryData<InventoryItem[]>(queryKey);

      // Optimistically update the cache
      queryClient.setQueryData<InventoryItem[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map(item =>
          item.id === itemId
            ? { ...item, ...data } // Merge updated fields
            : item
        );
      });

      // Return context with snapshot for potential rollback
      return { previousInventory };
    },

    // 2. ROLLBACK: If mutation fails, restore previous state
    onError: (err, variables, context) => {
      console.error('Failed to update inventory item:', err);
      if (context?.previousInventory) {
        queryClient.setQueryData(queryKey, context.previousInventory);
      }
    },

    // 3. REVALIDATE: Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // ============================================
  // MUTATION: Delete Item (Optimistic)
  // ============================================
  const deleteItem = useMutation({
    mutationFn: async (itemId: number) => {
      if (!token) throw new Error('No authentication token');
      return inventoryService.deleteItem(token, itemId);
    },

    // 1. OPTIMISTIC UPDATE: Remove from UI immediately
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey });

      const previousInventory = queryClient.getQueryData<InventoryItem[]>(queryKey);

      // Optimistically remove the item
      queryClient.setQueryData<InventoryItem[]>(queryKey, (old) => {
        if (!old) return old;
        return old.filter(item => item.id !== itemId);
      });

      return { previousInventory };
    },

    // 2. ROLLBACK: Restore deleted item if mutation fails
    onError: (err, variables, context) => {
      console.error('Failed to delete inventory item:', err);
      if (context?.previousInventory) {
        queryClient.setQueryData(queryKey, context.previousInventory);
      }
    },

    // 3. REVALIDATE
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // ============================================
  // MUTATION: Create Item (Optimistic)
  // ============================================
  const createItem = useMutation({
    mutationFn: async (data: Parameters<typeof inventoryService.createItem>[1]) => {
      if (!token) throw new Error('No authentication token');
      return inventoryService.createItem(token, data);
    },

    // 1. OPTIMISTIC UPDATE: Add to UI immediately with temporary ID
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey });

      const previousInventory = queryClient.getQueryData<InventoryItem[]>(queryKey);

      // Optimistically add the item with a temporary ID
      queryClient.setQueryData<InventoryItem[]>(queryKey, (old) => {
        if (!old) return old;
        const tempItem: InventoryItem = {
          id: Date.now(), // Temporary ID
          medicationId: newItem.medicationId,
          quantity: newItem.quantity,
          bonusQuantity: newItem.bonusQuantity || 0,
          costPrice: newItem.costPrice,
          salePrice: newItem.salePrice || newItem.costPrice,
          expiryDate: newItem.expiryDate,
          batchNumber: newItem.batchNumber,
          shelfLocation: newItem.shelfLocation,
          minStockLevel: newItem.minStockLevel,
          isAlarmSet: newItem.isAlarmSet || false,
          stock: newItem.quantity, // Alias
        };
        return [...old, tempItem];
      });

      return { previousInventory };
    },

    // 2. ROLLBACK
    onError: (err, variables, context) => {
      console.error('Failed to create inventory item:', err);
      if (context?.previousInventory) {
        queryClient.setQueryData(queryKey, context.previousInventory);
      }
    },

    // 3. REVALIDATE: Get real ID from server
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    // Query data
    inventory: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    
    // Mutations
    updateItem: updateItem.mutate,
    updateItemAsync: updateItem.mutateAsync,
    deleteItem: deleteItem.mutate,
    deleteItemAsync: deleteItem.mutateAsync,
    createItem: createItem.mutate,
    createItemAsync: createItem.mutateAsync,
    
    // Mutation states
    isUpdating: updateItem.isPending,
    isDeleting: deleteItem.isPending,
    isCreating: createItem.isPending,
  };
};
