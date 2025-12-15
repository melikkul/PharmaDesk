'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

interface Group {
  id: number;
  name: string;
  description: string | null;
}

interface Carrier {
  id: number;
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string | null;
  groups: { id: number; name: string }[];
}

interface CreateCarrierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingCarrier?: Carrier | null;
}

const CreateCarrierModal: React.FC<CreateCarrierModalProps> = ({ isOpen, onClose, onSuccess, editingCarrier }) => {
  const { api } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    groupIds: [] as number[],
  });
  
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchGroups();
      if (editingCarrier) {
        // Editing mode - populate form with existing data
        const [firstName, ...lastNameParts] = editingCarrier.fullName.split(' ');
        setFormData({
          username: editingCarrier.username,
          password: '', // Don't populate password for editing
          firstName: firstName || '',
          lastName: lastNameParts.join(' ') || '',
          email: editingCarrier.email,
          phoneNumber: editingCarrier.phoneNumber || '',
          groupIds: editingCarrier.groups.map(g => g.id),
        });
      } else {
        // Create mode - reset form
        setFormData({
          username: '',
          password: '',
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          groupIds: [],
        });
      }
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, editingCarrier]);

  const fetchGroups = async () => {
    try {
      const response = await api.get('/api/carriers/groups');
      setAvailableGroups(response.data);
    } catch (err) {
      console.error('Gruplar yüklenemedi', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGroupToggle = (groupId: number) => {
    setFormData(prev => ({
      ...prev,
      groupIds: prev.groupIds.includes(groupId)
        ? prev.groupIds.filter(id => id !== groupId)
        : [...prev.groupIds, groupId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (editingCarrier) {
        // Update existing carrier
        await api.put(`/api/carriers/${editingCarrier.id}`, formData);
        setSuccessMessage('Kurye başarıyla güncellendi!');
      } else {
        // Create new carrier
        await api.post('/api/carriers', formData);
        setSuccessMessage('Kurye başarıyla oluşturuldu!');
      }
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      const message = err.response?.data?.error || (editingCarrier ? 'Kurye güncellenemedi' : 'Kurye oluşturulamadı');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        width: '100%',
        maxWidth: '580px',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        animation: 'slideUp 0.3s ease-out'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '24px 28px',
          borderRadius: '20px 20px 0 0',
          position: 'relative'
        }}>
          <h2 style={{
            margin: 0,
            color: '#ffffff',
            fontSize: '22px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{
              width: '40px',
              height: '40px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>{editingCarrier ? '✏️' : '🚚'}</span>
            {editingCarrier ? 'Kurye Düzenle' : 'Yeni Kurye Ekle'}
          </h2>
          <p style={{
            margin: '8px 0 0 52px',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '14px'
          }}>
            {editingCarrier ? 'Kurye bilgilerini güncelleyin' : 'Kurye bilgilerini ve çalışma bölgelerini girin'}
          </p>
          <button 
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: '#fff',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >✕</button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} style={{ padding: '28px' }}>
          {/* Error/Success Messages */}
          {error && (
            <div style={{
              background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
              border: '1px solid #f87171',
              padding: '14px 18px',
              borderRadius: '12px',
              marginBottom: '20px',
              color: '#991b1b',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>⚠️</span> {error}
            </div>
          )}
          
          {successMessage && (
            <div style={{
              background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
              border: '1px solid #4ade80',
              padding: '14px 18px',
              borderRadius: '12px',
              marginBottom: '20px',
              color: '#166534',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>✅</span> {successMessage}
            </div>
          )}

          {/* Form Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '20px'
          }}>
            {/* Username */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#374151',
                fontSize: '13px',
                fontWeight: 600
              }}>Kullanıcı Adı *</label>
              <input
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="ornek_kurye"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  background: '#f9fafb'
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#374151',
                fontSize: '13px',
                fontWeight: 600
              }}>Şifre *</label>
              <input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  background: '#f9fafb'
                }}
              />
            </div>

            {/* First Name */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#374151',
                fontSize: '13px',
                fontWeight: 600
              }}>Ad *</label>
              <input
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="Ahmet"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  background: '#f9fafb'
                }}
              />
            </div>

            {/* Last Name */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#374151',
                fontSize: '13px',
                fontWeight: 600
              }}>Soyad *</label>
              <input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="Kurye"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  background: '#f9fafb'
                }}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#374151',
                fontSize: '13px',
                fontWeight: 600
              }}>Email *</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="kurye@example.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  background: '#f9fafb'
                }}
              />
            </div>

            {/* Phone */}
            <div>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#374151',
                fontSize: '13px',
                fontWeight: 600
              }}>Telefon</label>
              <input
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="555 123 4567"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  background: '#f9fafb'
                }}
              />
            </div>
          </div>

          {/* Groups Section */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '12px',
              color: '#374151',
              fontSize: '13px',
              fontWeight: 600
            }}>
              Çalışma Bölgeleri (Gruplar)
              <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: '8px' }}>
                Bir veya daha fazla seçin
              </span>
            </label>
            
            {availableGroups.length === 0 ? (
              <div style={{
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                padding: '14px 18px',
                borderRadius: '12px',
                color: '#92400e',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span>📍</span> Gruplar yükleniyor veya henüz grup oluşturulmamış...
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                {availableGroups.map(group => {
                  const isSelected = formData.groupIds.includes(group.id);
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => handleGroupToggle(group.id)}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '25px',
                        border: isSelected ? '2px solid #667eea' : '2px solid #e5e7eb',
                        background: isSelected 
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                          : '#ffffff',
                        color: isSelected ? '#ffffff' : '#4b5563',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>{isSelected ? '✓' : '○'}</span>
                      {group.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 28px',
                borderRadius: '10px',
                border: '2px solid #e5e7eb',
                background: '#ffffff',
                color: '#4b5563',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 32px',
                borderRadius: '10px',
                border: 'none',
                background: loading 
                  ? '#9ca3af' 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <span style={{ 
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }}></span>
                  {editingCarrier ? 'Güncelleniyor...' : 'Kaydediliyor...'}
                </>
              ) : (
                <>
                  <span>{editingCarrier ? '✓' : '💾'}</span>
                  {editingCarrier ? 'Güncelle' : 'Kaydet'}
                </>
              )}
            </button>
          </div>
        </form>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default CreateCarrierModal;
