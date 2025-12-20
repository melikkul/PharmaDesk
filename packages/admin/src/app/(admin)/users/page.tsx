'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import UserEditModal from '@/components/admin/UserEditModal';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import PasswordResetModal from '@/components/admin/PasswordResetModal';

interface UserGroup {
  id: number;
  name: string;
}

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  pharmacyName: string;
  gln: string;
  city: string;
  district: string;
  address: string;
  phoneNumber: string;
  createdAt: string;
  pharmacyId: string;
  isApproved: boolean;
  isActive: boolean;
  role: string;
  groups: UserGroup[];
  lastLoginDate?: string;
}

interface Group {
  id: number;
  name: string;
  description?: string;
}

type TabType = 'all' | 'pending' | 'approved' | 'active' | 'inactive';
type FilterRole = 'all' | 'User' | 'Admin';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  
  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);
  
  // Password Reset Modal
  const [passwordResetData, setPasswordResetData] = useState<{
    resetToken: string;
    resetLink: string;
    userEmail: string;
    expiresAt: string;
  } | null>(null);
  
  // Group Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupModalUser, setGroupModalUser] = useState<User | null>(null);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [groupModalLoading, setGroupModalLoading] = useState(false);
  const [groupModalError, setGroupModalError] = useState('');
  
  // Dropdown Menu State
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  const { api } = useAuth();

  // Toast helpers
  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/users');
      setUsers(response.data);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(`Kullanıcılar yüklenirken bir hata oluştu: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    setActionLoading(userId);
    try {
      await api.post(`/api/admin/users/${userId}/approve`);
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, isApproved: true } : u
      ));
      showToast('success', 'Kullanıcı başarıyla onaylandı.');
    } catch (err) {
      console.error('Approve failed:', err);
      showToast('error', 'Onaylama başarısız oldu.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const actionText = user.isActive ? 'pasife almak' : 'aktifleştirmek';
    setConfirmDialog({
      isOpen: true,
      title: user.isActive ? '🛑 Kullanıcıyı Pasife Al' : '✅ Kullanıcıyı Aktifleştir',
      message: `${user.firstName} ${user.lastName} kullanıcısını ${actionText} istediğinize emin misiniz?${user.isActive ? ' Bu işlem sonrasında kullanıcı sisteme giriş yapamayacaktır.' : ''}`,
      type: user.isActive ? 'warning' : 'info',
      confirmText: user.isActive ? 'Pasife Al' : 'Aktifleştir',
      onConfirm: async () => {
        setConfirmDialog(null);
        setActionLoading(user.id);
        try {
          const response = await api.patch(`/api/admin/users/${user.id}/toggle-status`);
          setUsers(prev => prev.map(u => 
            u.id === user.id ? { ...u, isActive: response.data.isActive } : u
          ));
          showToast('success', response.data.message);
        } catch (err: any) {
          console.error('Toggle status failed:', err);
          showToast('error', err.response?.data?.error || 'Durum değiştirme başarısız oldu.');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleDelete = async (user: User) => {
    setConfirmDialog({
      isOpen: true,
      title: '🗑️ Kullanıcıyı Sil',
      message: `${user.firstName} ${user.lastName} (${user.email}) kullanıcısını ve tüm ilişkili verileri KALICI OLARAK silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`,
      type: 'danger',
      confirmText: 'Kalıcı Olarak Sil',
      onConfirm: async () => {
        setConfirmDialog(null);
        setActionLoading(user.id);
        try {
          await api.delete(`/api/admin/users/${user.id}`);
          setUsers(prev => prev.filter(u => u.id !== user.id));
          showToast('success', 'Kullanıcı ve tüm ilişkili veriler silindi.');
        } catch (err: any) {
          console.error('Delete failed:', err);
          showToast('error', err.response?.data?.error || 'Silme işlemi başarısız oldu.');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleResetPassword = async (user: User) => {
    setConfirmDialog({
      isOpen: true,
      title: '🔑 Şifre Sıfırlama',
      message: `${user.firstName} ${user.lastName} kullanıcısı için şifre sıfırlama token'ı oluşturmak istediğinize emin misiniz?`,
      type: 'warning',
      confirmText: 'Token Oluştur',
      onConfirm: async () => {
        setConfirmDialog(null);
        setActionLoading(user.id);
        try {
          const response = await api.post(`/api/admin/users/${user.id}/reset-password`);
          setPasswordResetData(response.data);
          showToast('success', 'Şifre sıfırlama token\'ı oluşturuldu.');
        } catch (err: any) {
          console.error('Reset password failed:', err);
          showToast('error', err.response?.data?.error || 'Şifre sıfırlama başarısız oldu.');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleSaveUser = async (userId: number, data: Partial<User>) => {
    await api.put(`/api/admin/users/${userId}`, data);
    await fetchUsers();
    showToast('success', 'Kullanıcı bilgileri güncellendi.');
  };

  const openGroupModal = async (user: User) => {
    setGroupModalUser(user);
    setIsGroupModalOpen(true);
    setAvailableGroups([]);
    setSelectedGroupIds(user.groups?.map(g => g.id) || []);
    setGroupModalError('');
    setGroupModalLoading(true);

    try {
      const res = await api.get('/api/groups');
      const allGroups: any[] = res.data;
      const userCity = user.city?.trim().toLowerCase() || '';
      const filteredGroups = allGroups.filter((g: any) => 
        g.cityName?.trim().toLowerCase() === userCity
      );
      setAvailableGroups(filteredGroups.map((g: any) => ({ id: g.id, name: g.name, description: g.description })));
      if (filteredGroups.length === 0) {
        setGroupModalError(`"${user.city}" ili için uygun grup bulunamadı.`);
      }
    } catch (err) {
      console.error(err);
      setGroupModalError('Gruplar yüklenemedi.');
    } finally {
      setGroupModalLoading(false);
    }
  };

  const toggleGroupSelection = (groupId: number) => {
    setSelectedGroupIds(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  const handleAssignGroups = async () => {
    if (!groupModalUser || selectedGroupIds.length === 0) return;
    setGroupModalLoading(true);
    setGroupModalError('');

    try {
      for (const groupId of selectedGroupIds) {
        const existingGroupIds = groupModalUser.groups?.map(g => g.id) || [];
        if (!existingGroupIds.includes(groupId)) {
          await api.post('/api/admin/assign-group', {
            pharmacyId: groupModalUser.pharmacyId,
            groupId: groupId
          });
        }
      }
      
      showToast('success', 'Gruplar başarıyla güncellendi!');
      await fetchUsers();
      
      setTimeout(() => {
        setIsGroupModalOpen(false);
      }, 500);
    } catch (err: any) {
      console.error(err);
      setGroupModalError(err.response?.data?.error || 'Grup ataması başarısız oldu.');
    } finally {
      setGroupModalLoading(false);
    }
  };

  // Filter users based on tab, role, and search
  const filteredUsers = users.filter(user => {
    // Tab filter
    if (activeTab === 'pending' && user.isApproved !== false) return false;
    if (activeTab === 'approved' && user.isApproved !== true) return false;
    if (activeTab === 'active' && user.isActive !== true) return false;
    if (activeTab === 'inactive' && user.isActive !== false) return false;
    
    // Role filter
    if (filterRole !== 'all' && user.role !== filterRole) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        user.email?.toLowerCase().includes(query) ||
        user.firstName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query) ||
        user.pharmacyName?.toLowerCase().includes(query) ||
        user.city?.toLowerCase().includes(query) ||
        user.groups?.some(g => g.name?.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const pendingCount = users.filter(u => u.isApproved === false).length;
  const approvedCount = users.filter(u => u.isApproved === true).length;
  const activeCount = users.filter(u => u.isActive === true).length;
  const inactiveCount = users.filter(u => u.isActive === false).length;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-600 font-medium">Kullanıcılar yükleniyor...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-semibold text-red-800 mb-2">Hata Oluştu</h2>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={fetchUsers}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Kullanıcı Yönetimi
            </h1>
            <p className="text-slate-500 mt-1">Tüm kullanıcıları yönetin, onaylayın ve düzenleyin</p>
          </div>
          <button 
            onClick={fetchUsers}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
          >
            <span>🔄</span>
            <span className="font-medium text-slate-700">Yenile</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                👥
              </div>
              <div>
                <p className="text-sm text-slate-500">Toplam</p>
                <p className="text-2xl font-bold text-slate-900">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl">
                ⏳
              </div>
              <div>
                <p className="text-sm text-slate-500">Bekleyen</p>
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-2xl">
                ✅
              </div>
              <div>
                <p className="text-sm text-slate-500">Onaylı</p>
                <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">
                🟢
              </div>
              <div>
                <p className="text-sm text-slate-500">Aktif</p>
                <p className="text-2xl font-bold text-green-600">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-2xl">
                🔴
              </div>
              <div>
                <p className="text-sm text-slate-500">Pasif</p>
                <p className="text-2xl font-bold text-red-600">{inactiveCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-visible">
          <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Tabs */}
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: 'Tümü', icon: '📋', count: users.length },
                { key: 'pending', label: 'Bekleyenler', icon: '⏳', count: pendingCount },
                { key: 'approved', label: 'Onaylı', icon: '✅', count: approvedCount },
                { key: 'active', label: 'Aktif', icon: '🟢', count: activeCount },
                { key: 'inactive', label: 'Pasif', icon: '🔴', count: inactiveCount }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 w-full lg:w-auto">
              {/* Role Filter */}
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as FilterRole)}
                className="px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">Tüm Roller</option>
                <option value="User">Kullanıcı</option>
                <option value="Admin">Admin</option>
              </select>
              
              {/* Search */}
              <div className="relative flex-1 lg:w-64">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                <input
                  type="text"
                  placeholder="Kullanıcı veya grup ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Kullanıcı</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">İletişim</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Eczane</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Gruplar</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Kayıt Tarihi</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="text-4xl mb-2">📭</div>
                      <p className="text-slate-500">Kullanıcı bulunamadı</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{user.firstName} {user.lastName}</p>
                            <p className="text-xs text-slate-400">{user.city} / {user.district}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-700 text-sm">{user.email}</p>
                        <p className="text-xs text-slate-400">{user.gln || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900 text-sm">{user.pharmacyName || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {/* Approval Status */}
                          {user.isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 w-fit">
                              <span>✓</span> Onaylı
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 w-fit">
                              <span>⏳</span> Bekliyor
                            </span>
                          )}
                          {/* Active Status */}
                          {user.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 w-fit">
                              <span>🟢</span> Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 w-fit">
                              <span>🔴</span> Pasif
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.groups && user.groups.length > 0 ? (
                            user.groups.map(group => (
                              <span 
                                key={group.id} 
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700"
                              >
                                {group.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">Grup yok</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {/* Primary Action: View/Edit */}
                          <button
                            onClick={() => handleEditUser(user)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium shadow-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            İncele
                          </button>
                          
                          {/* Dropdown Menu */}
                          <div className="relative">
                            <button
                              className="inline-flex items-center justify-center w-8 h-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(openDropdownId === user.id ? null : user.id);
                              }}
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                            
                            {/* Dropdown Content - Positioned outside table flow */}
                            {openDropdownId === user.id && (
                              <>
                                {/* Backdrop to close dropdown */}
                                <div 
                                  className="fixed inset-0 z-[99]" 
                                  onClick={() => setOpenDropdownId(null)}
                                />
                                <div className="fixed right-4 mt-1 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-[100]" style={{ marginTop: '8px' }}>
                                  {/* Approve (only for pending) */}
                                  {!user.isApproved && (
                                    <button
                                      onClick={() => { handleApprove(user.id); setOpenDropdownId(null); }}
                                      disabled={actionLoading === user.id}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-emerald-50 text-emerald-700 disabled:opacity-50 transition-colors"
                                    >
                                      <span className="w-5 text-center">✓</span>
                                      <span>Onayla</span>
                                    </button>
                                  )}
                                  
                                  {/* Toggle Status */}
                                  <button
                                    onClick={() => { handleToggleStatus(user); setOpenDropdownId(null); }}
                                    disabled={actionLoading === user.id}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors disabled:opacity-50 ${
                                      user.isActive
                                        ? 'hover:bg-amber-50 text-amber-700'
                                        : 'hover:bg-green-50 text-green-700'
                                    }`}
                                  >
                                    <span className="w-5 text-center">{user.isActive ? '🛑' : '✅'}</span>
                                    <span>{user.isActive ? 'Pasife Al' : 'Aktifleştir'}</span>
                                  </button>
                                  
                                  {/* Group Management */}
                                  <button
                                    onClick={() => { openGroupModal(user); setOpenDropdownId(null); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-purple-50 text-purple-700 transition-colors"
                                  >
                                    <span className="w-5 text-center">👥</span>
                                    <span>Grup Yönetimi</span>
                                  </button>
                                  
                                  {/* Reset Password */}
                                  <button
                                    onClick={() => { handleResetPassword(user); setOpenDropdownId(null); }}
                                    disabled={actionLoading === user.id}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-slate-50 text-slate-700 disabled:opacity-50 transition-colors"
                                  >
                                    <span className="w-5 text-center">🔑</span>
                                    <span>Şifre Sıfırla</span>
                                  </button>
                                  
                                  {/* Divider */}
                                  <div className="my-1 border-t border-slate-100"></div>
                                  
                                  {/* Delete */}
                                  <button
                                    onClick={() => { handleDelete(user); setOpenDropdownId(null); }}
                                    disabled={actionLoading === user.id}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-red-50 text-red-600 disabled:opacity-50 transition-colors"
                                  >
                                    <span className="w-5 text-center">🗑️</span>
                                    <span>Sil</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${
              toast.type === 'success' ? 'bg-emerald-500' :
              toast.type === 'error' ? 'bg-red-500' :
              toast.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
            } text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-right-5 fade-in duration-300`}
          >
            <span className="text-lg font-bold">
              {toast.type === 'success' ? '✓' :
               toast.type === 'error' ? '✕' :
               toast.type === 'warning' ? '⚠' : 'ℹ'}
            </span>
            <span className="flex-1 text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="hover:bg-white/20 rounded-lg p-1 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* User Edit Modal */}
      <UserEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSave={handleSaveUser}
      />

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.type}
          confirmText={confirmDialog.confirmText}
          loading={actionLoading !== null}
        />
      )}

      {/* Password Reset Modal */}
      <PasswordResetModal
        isOpen={passwordResetData !== null}
        onClose={() => setPasswordResetData(null)}
        resetData={passwordResetData}
      />

      {/* Group Assignment Modal */}
      {isGroupModalOpen && groupModalUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Grup Yönetimi</h2>
              <p className="text-slate-500 mt-1">{groupModalUser.firstName} {groupModalUser.lastName}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Şehir:</span> {groupModalUser.city}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Aynı şehirdeki tüm gruplara atama yapabilirsiniz.
                    </p>
                  </div>
                  <span className="text-2xl">🏥</span>
                </div>
              </div>

              {groupModalUser.groups && groupModalUser.groups.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Mevcut Gruplar:</p>
                  <div className="flex flex-wrap gap-2">
                    {groupModalUser.groups.map(g => (
                      <span key={g.id} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                        {g.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {groupModalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
                  {groupModalError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Grupları Seçin (Birden fazla seçebilirsiniz)
                </label>
                {groupModalLoading ? (
                  <div className="p-4 text-center text-slate-500">Yükleniyor...</div>
                ) : availableGroups.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl">
                    Bu şehirde grup bulunamadı.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableGroups.map(group => (
                      <label 
                        key={group.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedGroupIds.includes(group.id)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.includes(group.id)}
                          onChange={() => toggleGroupSelection(group.id)}
                          className="w-5 h-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{group.name}</p>
                          {group.description && (
                            <p className="text-xs text-slate-500">{group.description}</p>
                          )}
                        </div>
                        {selectedGroupIds.includes(group.id) && (
                          <span className="text-purple-600">✓</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  Seçili grup sayısı: <strong>{selectedGroupIds.length}</strong>
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                disabled={groupModalLoading}
              >
                İptal
              </button>
              <button
                onClick={handleAssignGroups}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                disabled={groupModalLoading || selectedGroupIds.length === 0}
              >
                {groupModalLoading ? 'İşleniyor...' : `${selectedGroupIds.length} Grup Ata`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
