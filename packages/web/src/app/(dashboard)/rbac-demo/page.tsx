"use client";

import { Protect, useHasRole, useIsAdmin } from '@/components/auth';
import { useAuth } from '@/store/AuthContext';

/**
 * RBAC Demo Page - Demonstrates role-based access control
 * This page shows different content based on user role
 */
export default function RBACDemoPage() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = useIsAdmin();
  const canManageInventory = useHasRole(['Admin', 'Pharmacy']);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">RBAC Demo - Role-Based Access Control</h1>
      
      {/* User Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Current User Info</h2>
        {isAuthenticated && user ? (
          <div className="space-y-2">
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Name:</strong> {user.fullName}</p>
            <p><strong>Role:</strong> <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">{user.role}</span></p>
            <p><strong>Pharmacy ID:</strong> {user.pharmacyId}</p>
          </div>
        ) : (
          <p className="text-gray-500">Not authenticated</p>
        )}
      </div>

      {/* Demo Sections */}
      <div className="space-y-6">
        
        {/* Admin Only Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Admin Only Section</h2>
          <Protect role="Admin">
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="text-red-800 font-semibold">🔐 Admin Access Granted!</p>
              <p className="text-red-700 mt-2">You can see this because you have Admin role.</p>
              <button className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                Delete User
              </button>
            </div>
          </Protect>
          
          <Protect role="Admin" not>
            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <p className="text-gray-600">❌ Admin access required to see this content.</p>
            </div>
          </Protect>
        </div>

        {/* Pharmacy or Admin Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Pharmacy or Admin Section</h2>
          <Protect role={["Admin", "Pharmacy"]}>
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="text-green-800 font-semibold">✅ Access Granted!</p>
              <p className="text-green-700 mt-2">You can see this as Admin or Pharmacy.</p>
              <button className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                Manage Inventory
              </button>
            </div>
          </Protect>
          
          <Protect role={["Admin", "Pharmacy"]} not>
            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <p className="text-gray-600">❌ Pharmacy or Admin access required.</p>
            </div>
          </Protect>
        </div>

        {/* Regular User Only Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Regular User Section</h2>
          <Protect role="User">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-blue-800 font-semibold">👤 Regular User Access</p>
              <p className="text-blue-700 mt-2">This is visible only to regular users.</p>
            </div>
          </Protect>
          
          <Protect role="User" not>
            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <p className="text-gray-600">👥 You are Admin or Pharmacy (not a regular user).</p>
            </div>
          </Protect>
        </div>

        {/* Hooks Demo */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Helper Hooks Demo</h2>
          <div className="space-y-2">
            <p><code>useIsAdmin()</code>: {isAdmin ? '✅ true' : '❌ false'}</p>
            <p><code>useHasRole(['Admin', 'Pharmacy'])</code>: {canManageInventory ? '✅ true' : '❌ false'}</p>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Usage Examples</h2>
          <div className="bg-gray-50 p-4 rounded">
            <pre className="text-sm overflow-x-auto">
{`// Show only to Admin
<Protect role="Admin">
  <button>Delete User</button>
</Protect>

// Show to Admin or Pharmacy
<Protect role={["Admin", "Pharmacy"]}>
  <button>Manage Inventory</button>
</Protect>

// Hide from regular users (inverse mode)
<Protect role="User" not>
  <p>Admin/Pharmacy only content</p>
</Protect>

// Use hooks for conditional logic
const isAdmin = useIsAdmin();
const canManage = useHasRole(['Admin', 'Pharmacy']);`}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
}
