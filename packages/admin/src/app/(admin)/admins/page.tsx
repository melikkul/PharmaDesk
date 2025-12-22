'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import styles from './admins.module.css';

interface Admin {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

export default function AdminsPage() {
  const { api } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Admin | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/admin/admins');
      setAdmins(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch admins:', err);
      setError('Yöneticiler yüklenirken hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Email ve şifre zorunludur.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/api/admin/admins', formData);
      setShowModal(false);
      setFormData({ firstName: '', lastName: '', email: '', password: '' });
      fetchAdmins();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      console.error('Failed to create admin:', err);
      setError(error.response?.data?.error || 'Yönetici oluşturulurken hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (admin: Admin) => {
    try {
      await api.delete(`/api/admin/admins/${admin.id}`);
      setDeleteConfirm(null);
      fetchAdmins();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      console.error('Failed to delete admin:', err);
      setError(error.response?.data?.error || 'Yönetici silinirken hata oluştu.');
      setDeleteConfirm(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || '?';
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>👥 Yönetici Yönetimi</h1>
          <p className={styles.subtitle}>Sistem yöneticilerini görüntüleyin ve yönetin</p>
        </div>
        <button className={styles.addButton} onClick={() => setShowModal(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="19" y1="8" x2="19" y2="14"/>
            <line x1="22" y1="11" x2="16" y2="11"/>
          </svg>
          Yeni Yönetici Ekle
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{admins.length}</span>
          <span className={styles.statLabel}>Toplam Yönetici</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{admins.filter(a => a.role === 'SuperAdmin').length}</span>
          <span className={styles.statLabel}>SuperAdmin</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{admins.filter(a => a.role === 'Admin').length}</span>
          <span className={styles.statLabel}>Standart Admin</span>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Yönetici</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Oluşturulma Tarihi</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {admins.map(admin => (
              <tr key={admin.id}>
                <td>
                  <div className={styles.userCell}>
                    <div className={`${styles.avatar} ${admin.role === 'SuperAdmin' ? styles.avatarSuper : ''}`}>
                      {getInitials(admin.firstName, admin.lastName)}
                    </div>
                    <div className={styles.userInfo}>
                      <span className={styles.userName}>{admin.firstName} {admin.lastName}</span>
                      <span className={styles.userId}>ID: {admin.id}</span>
                    </div>
                  </div>
                </td>
                <td className={styles.emailCell}>{admin.email}</td>
                <td>
                  <span className={`${styles.badge} ${admin.role === 'SuperAdmin' ? styles.superAdmin : styles.admin}`}>
                    {admin.role === 'SuperAdmin' ? '👑 SuperAdmin' : '👤 Admin'}
                  </span>
                </td>
                <td className={styles.dateCell}>{formatDate(admin.createdAt)}</td>
                <td>
                  {admin.role !== 'SuperAdmin' ? (
                    <button 
                      className={styles.deleteButton}
                      onClick={() => setDeleteConfirm(admin)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      Sil
                    </button>
                  ) : (
                    <span className={styles.protected}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      Korumalı
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {admins.length === 0 && (
          <div className={styles.empty}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p>Henüz yönetici bulunmuyor.</p>
          </div>
        )}
      </div>

      {/* Add Admin Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Yeni Yönetici Ekle</h2>
              <button className={styles.closeButton} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="firstName">Ad</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Adı girin"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="lastName">Soyad</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Soyadı girin"
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email adresini girin"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="password">Şifre *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Şifre girin (min. 6 karakter)"
                  required
                  minLength={6}
                />
              </div>
              <div className={styles.roleInfo}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                Yeni yöneticiler <strong>Admin</strong> rolüyle oluşturulur.
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowModal(false)} className={styles.cancelButton}>
                  İptal
                </button>
                <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                  {isSubmitting ? 'Oluşturuluyor...' : 'Yönetici Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setDeleteConfirm(null)}>
          <div className={styles.deleteModal} onClick={e => e.stopPropagation()}>
            <div className={styles.deleteIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <h3>Yöneticiyi Sil</h3>
            <p>
              <strong>{deleteConfirm.firstName} {deleteConfirm.lastName}</strong> ({deleteConfirm.email}) 
              adlı yöneticiyi silmek istediğinize emin misiniz?
            </p>
            <p className={styles.deleteWarning}>Bu işlem geri alınamaz!</p>
            <div className={styles.deleteActions}>
              <button className={styles.cancelButton} onClick={() => setDeleteConfirm(null)}>
                İptal
              </button>
              <button className={styles.confirmDeleteButton} onClick={() => handleDelete(deleteConfirm)}>
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

