'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  pharmacyName: string;
  gln: string;
  city: string;
  district: string;
  createdAt: string;
  pharmacyId: string; // Changed from number - backend sends as string to avoid JS precision loss
}

interface Group {
  id: number;
  name: string;
  description?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const { api } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/users');
      setUsers(response.data);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(`Kullanıcılar yüklenirken bir hata oluştu: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const openAssignModal = async (user: User) => {
    setSelectedUser(user);
    setIsModalOpen(true);
    setAvailableGroups([]);
    setSelectedGroupId(null);
    setModalError('');
    setModalSuccess('');
    setModalLoading(true);

    try {
      // Fetch groups for the user's city
      // We need to find the city ID first? Or does the API accept city name?
      // The GroupsController has GetGroupsByCity(int cityId).
      // But we only have city Name in User object.
      // We need to fetch all cities to find the ID, or fetch all groups and filter.
      // Let's fetch all groups and filter by city name for now (client side filtering)
      // Or better: The backend AssignGroup validates city match.
      // Let's fetch all groups and show them. The backend will reject if city mismatch.
      // Ideally we should filter.
      
      const res = await api.get('/api/groups');
      const allGroups: any[] = res.data;
      
      // Filter groups by user's city
      // Note: Group object has CityName. User has city (string).
      // We should normalize strings.
      const userCity = user.city.trim().toLowerCase();
      const filteredGroups = allGroups.filter((g: any) => 
        g.cityName?.trim().toLowerCase() === userCity
      );

      setAvailableGroups(filteredGroups.map((g: any) => ({ id: g.id, name: g.name, description: g.description })));

      if (filteredGroups.length === 0) {
        setModalError(`"${user.city}" ili için uygun grup bulunamadı.`);
      }

    } catch (err) {
      console.error(err);
      setModalError('Gruplar yüklenemedi.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAssignGroup = async () => {
    if (!selectedUser || !selectedGroupId) return;

    setModalLoading(true);
    setModalError('');
    setModalSuccess('');

    try {
      await api.post('/api/admin/assign-group', {
        pharmacyId: selectedUser.pharmacyId, // Send as string, backend will parse
        groupId: selectedGroupId
      });
      
      setModalSuccess('Grup başarıyla atandı!');
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setModalError(err.response?.data?.error || 'Grup atanamadı.');
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Kullanıcı Yönetimi</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Kullanıcı Yönetimi</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Kullanıcı Yönetimi</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <p className="text-sm text-gray-600">Toplam {users.length} kullanıcı</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İsim</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Eczane</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şehir</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kayıt Tarihi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.pharmacyName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.city} / {user.district}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <button
                      onClick={() => openAssignModal(user)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      Grup Ata
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Grup Ata: {selectedUser.firstName} {selectedUser.lastName}</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Kullanıcının Şehri: <strong>{selectedUser.city}</strong>
              </p>
              <p className="text-xs text-gray-500">
                Sadece bu şehirdeki gruplar listelenir.
              </p>
            </div>

            {modalError && (
              <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
                {modalError}
              </div>
            )}

            {modalSuccess && (
              <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">
                {modalSuccess}
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grup Seçin
              </label>
              <select
                value={selectedGroupId || ''}
                onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-md p-2"
                disabled={modalLoading || availableGroups.length === 0}
              >
                <option value="">Seçiniz...</option>
                {availableGroups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                disabled={modalLoading}
              >
                İptal
              </button>
              <button
                onClick={handleAssignGroup}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={modalLoading || !selectedGroupId}
              >
                {modalLoading ? 'İşleniyor...' : 'Ata'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

