'use client';

import React, { useEffect, useState } from 'react';

interface PendingUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  pharmacyName: string;
  gln: string;
  city: string;
  district: string;
  createdAt: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export default function ApprovalsPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchPendingUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/pending`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setPendingUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch pending users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleApprove = async (userId: number) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/approve`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        // Remove from list
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        const data = await res.json();
        alert(data.error || 'Onaylama başarısız.');
      }
    } catch (err) {
      console.error('Approve failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: number) => {
    if (!confirm('Bu kullanıcıyı reddetmek istediğinize emin misiniz?')) return;
    setActionLoading(userId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/reject`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setPendingUsers(prev => prev.filter(u => u.id !== userId));
      } else {
        const data = await res.json();
        alert(data.error || 'Reddetme başarısız.');
      }
    } catch (err) {
      console.error('Reject failed:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Onay Bekleyen Eczaneler</h1>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-warning/10 text-warning rounded-full text-sm font-medium">
            {pendingUsers.length} Bekleyen
          </span>
          <button 
            onClick={fetchPendingUsers}
            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20"
          >
            Yenile
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-secondary">Yükleniyor...</div>
        ) : pendingUsers.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">
            Onay bekleyen kullanıcı bulunmuyor.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="p-4 font-semibold text-text-secondary text-sm">Eczane Adı</th>
                <th className="p-4 font-semibold text-text-secondary text-sm">Kullanıcı</th>
                <th className="p-4 font-semibold text-text-secondary text-sm">E-posta</th>
                <th className="p-4 font-semibold text-text-secondary text-sm">Başvuru Tarihi</th>
                <th className="p-4 font-semibold text-text-secondary text-sm">Şehir</th>
                <th className="p-4 font-semibold text-text-secondary text-sm text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pendingUsers.map((user) => (
                <tr key={user.id} className="hover:bg-background/50 transition-colors">
                  <td className="p-4 font-medium text-text-primary">{user.pharmacyName || '-'}</td>
                  <td className="p-4 text-text-secondary">{user.firstName} {user.lastName}</td>
                  <td className="p-4 text-text-secondary">{user.email}</td>
                  <td className="p-4 text-text-secondary">{formatDate(user.createdAt)}</td>
                  <td className="p-4 text-text-secondary">{user.city || '-'}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleApprove(user.id)}
                        disabled={actionLoading === user.id}
                        className="p-2 bg-success/10 text-success rounded hover:bg-success hover:text-white transition-colors disabled:opacity-50" 
                        title="Onayla"
                      >
                        ✓
                      </button>
                      <button 
                        onClick={() => handleReject(user.id)}
                        disabled={actionLoading === user.id}
                        className="p-2 bg-danger/10 text-danger rounded hover:bg-danger hover:text-white transition-colors disabled:opacity-50" 
                        title="Reddet"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

