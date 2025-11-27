/**
 * Example component demonstrating Optimistic Updates with useInventory hook
 * 
 * This example shows how to use the refactored useInventory hook
 * for instant UI updates before backend confirmation.
 */

'use client';

import { useState } from 'react';
import { useInventory } from '@/hooks/useInventory';

export default function InventoryOptimisticExample() {
  const {
    inventory,
    loading,
    error,
    updateItem,
    deleteItem,
    createItem,
    isUpdating,
    isDeleting,
    isCreating,
  } = useInventory();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(0);

  // ============================================
  // UPDATE EXAMPLE: Change quantity
  // ============================================
  const handleUpdateQuantity = (itemId: number, newQuantity: number) => {
    // UI updates INSTANTLY, backend call happens in background
    updateItem(
      {
        itemId,
        data: { quantity: newQuantity },
      },
      {
        onSuccess: () => {
          console.log('✅ Update confirmed by server');
          setEditingId(null);
        },
        onError: (error) => {
          console.error('❌ Update failed, rolled back:', error);
          alert('Failed to update quantity. Changes have been reverted.');
        },
      }
    );
  };

  // ============================================
  // DELETE EXAMPLE: Remove item
  // ============================================
  const handleDelete = (itemId: number, itemName: string) => {
    if (!confirm(`Delete ${itemName}?`)) return;

    // Item disappears INSTANTLY from UI
    deleteItem(itemId, {
      onSuccess: () => {
        console.log('✅ Delete confirmed by server');
      },
      onError: (error) => {
        console.error('❌ Delete failed, item restored:', error);
        alert('Failed to delete item. It has been restored.');
      },
    });
  };

  // ============================================
  // CREATE EXAMPLE: Add new item
  // ============================================
  const handleCreate = () => {
    const newItem = {
      medicationId: 1,
      quantity: 100,
      bonusQuantity: 10,
      costPrice: 50.0,
      salePrice: 75.0,
      expiryDate: '2025-12-31',
      batchNumber: 'BATCH-001',
      shelfLocation: 'A-12',
      minStockLevel: 20,
      isAlarmSet: true,
    };

    // New item appears INSTANTLY with temporary ID
    createItem(newItem, {
      onSuccess: (data) => {
        console.log('✅ Create confirmed, real ID:', data.id);
      },
      onError: (error) => {
        console.error('❌ Create failed, item removed:', error);
        alert('Failed to create item. It has been removed.');
      },
    });
  };

  // ============================================
  // RENDER
  // ============================================
  if (loading) return <div>Loading inventory...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventory - Optimistic Updates Demo</h1>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {isCreating ? 'Creating...' : 'Add Test Item'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Medication
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {inventory.map((item) => (
              <tr
                key={item.id}
                className={`
                  transition-opacity duration-200
                  ${isDeleting ? 'opacity-50' : 'opacity-100'}
                `}
              >
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {item.medication?.name || `Medication #${item.medicationId}`}
                  </div>
                </td>

                <td className="px-6 py-4">
                  {editingId === item.id ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(Number(e.target.value))}
                        className="w-20 px-2 py-1 border rounded"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateQuantity(item.id, editQuantity)}
                        disabled={isUpdating}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 bg-gray-300 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">{item.quantity}</span>
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setEditQuantity(item.quantity);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </td>

                <td className="px-6 py-4">
                  <button
                    onClick={() =>
                      handleDelete(item.id, item.medication?.name || 'this item')
                    }
                    disabled={isDeleting}
                    className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {inventory.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No inventory items. Click "Add Test Item" to create one.
          </div>
        )}
      </div>

      {/* DEMO INSTRUCTIONS */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">🚀 How Optimistic Updates Work:</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>
            <strong>Update:</strong> Click "Edit" → Change quantity → Click "Save". Notice the UI
            updates INSTANTLY before the server responds.
          </li>
          <li>
            <strong>Delete:</strong> Click "Delete". The item disappears IMMEDIATELY from the list.
          </li>
          <li>
            <strong>Create:</strong> Click "Add Test Item". New item appears with a temporary ID.
          </li>
          <li>
            <strong>Rollback:</strong> If the server request fails, changes are automatically
            reverted.
          </li>
          <li>
            <strong>Revalidation:</strong> After every mutation, data is refetched from the server
            to ensure consistency.
          </li>
        </ul>
      </div>

      {/* NETWORK THROTTLING TIP */}
      <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold text-yellow-900 mb-2">💡 Testing Tip:</h3>
        <p className="text-sm text-yellow-800">
          Open DevTools → Network tab → Throttle to "Slow 3G" to see optimistic updates in action.
          The UI will update instantly while the network request is still pending!
        </p>
      </div>
    </div>
  );
}
