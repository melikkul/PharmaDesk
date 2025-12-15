'use client';

import React, { useEffect, useState } from 'react';
import styles from './Cargo.module.css';
import tableStyles from '../../../components/Table.module.css';
import CreateCarrierModal from '../../../components/cargo/CreateCarrierModal';
import LiveCarrierMap from '../../../components/cargo/LiveCarrierMap';
import { useAuth } from '../../../context/AuthContext';

interface Carrier {
  id: number;
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string | null;
  status: string;
  isActive: boolean;
  lastLoginDate: string | null;
  groups: { id: number; name: string }[];
}

interface Shipment {
  id: number;
  trackingNumber: string;
  status: string;
  senderPharmacy: string;
  receiverPharmacy: string;
  createdAt: string;
  carrierName?: string;
}

type TabType = 'carriers' | 'shipments' | 'liveTracking';

export default function CargoManagementPage() {
  const { api, isAuthenticated, isLoading: authLoading } = useAuth();
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('carriers');

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (activeTab === 'carriers') {
        fetchCarriers();
      } else {
        fetchShipments();
      }
    }
  }, [authLoading, isAuthenticated, activeTab]);

  const fetchCarriers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/carriers');
      setCarriers(response.data);
    } catch (error) {
      console.error('Kuryeler yüklenemedi', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/shipments');
      setShipments(response.data || []);
    } catch (error) {
      console.error('Kargolar yüklenemedi', error);
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    fetchCarriers();
  };

  const handleEditCarrier = (carrier: Carrier) => {
    setEditingCarrier(carrier);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCarrier(null);
  };

  const handleToggleActive = async (carrierId: number, currentStatus: boolean) => {
    try {
      await api.patch(`/api/carriers/${carrierId}/toggle-status`);
      fetchCarriers();
    } catch (error) {
      console.error('Durum değiştirilemedi', error);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('tr-TR');
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bg: string }> = {
      'Pending': { label: 'Bekliyor', color: '#92400e', bg: '#fef3c7' },
      'InTransit': { label: 'Yolda', color: '#1e40af', bg: '#dbeafe' },
      'Delivered': { label: 'Teslim Edildi', color: '#166534', bg: '#dcfce7' },
      'Cancelled': { label: 'İptal', color: '#991b1b', bg: '#fee2e2' },
    };
    const s = statusMap[status] || { label: status, color: '#374151', bg: '#f3f4f6' };
    return (
      <span style={{ padding: '4px 10px', borderRadius: '6px', backgroundColor: s.bg, color: s.color, fontSize: '12px', fontWeight: 500 }}>
        {s.label}
      </span>
    );
  };

  if (authLoading) {
    return <div className={styles.container}><p>Yükleniyor...</p></div>;
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Kargo & Kurye Yönetimi</h1>
          <p className={styles.subtitle}>Kuryeleri, kargoları ve hizmet bölgelerini yönetin</p>
        </div>
        {activeTab === 'carriers' && (
          <button 
            className={styles.createButton}
            onClick={() => { setEditingCarrier(null); setIsModalOpen(true); }}
          >
            + Yeni Kurye Ekle
          </button>
        )}
      </header>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0',
        marginBottom: '24px',
        borderBottom: '2px solid #e5e7eb'
      }}>
        <button
          onClick={() => setActiveTab('carriers')}
          style={{
            padding: '14px 28px',
            border: 'none',
            background: activeTab === 'carriers' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
            color: activeTab === 'carriers' ? '#fff' : '#6b7280',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: '10px 10px 0 0',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🚚 Kurye Yönetimi
        </button>
        <button
          onClick={() => setActiveTab('shipments')}
          style={{
            padding: '14px 28px',
            border: 'none',
            background: activeTab === 'shipments' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
            color: activeTab === 'shipments' ? '#fff' : '#6b7280',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: '10px 10px 0 0',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📦 Kargo Takibi
        </button>
        <button
          onClick={() => setActiveTab('liveTracking')}
          style={{
            padding: '14px 28px',
            border: 'none',
            background: activeTab === 'liveTracking' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
            color: activeTab === 'liveTracking' ? '#fff' : '#6b7280',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: '10px 10px 0 0',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📍 Canlı Takip
        </button>
      </div>

      {/* Carriers Tab */}
      {activeTab === 'carriers' && (
        <div className={styles.card}>
          <div style={{ overflowX: 'auto' }}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ad Soyad</th>
                  <th>Kullanıcı Adı</th>
                  <th>İletişim</th>
                  <th>Bölgeler (Gruplar)</th>
                  <th>Durum</th>
                  <th>Son Giriş</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{textAlign: 'center', padding: '40px'}}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <span style={{ width: '20px', height: '20px', border: '2px solid #667eea', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                      Yükleniyor...
                    </div>
                  </td></tr>
                ) : carriers.length === 0 ? (
                  <tr><td colSpan={8} style={{textAlign: 'center', padding: '40px', color: '#9ca3af'}}>
                    <div>📭 Kayıtlı kurye bulunamadı.</div>
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      style={{ marginTop: '12px', padding: '8px 16px', background: '#667eea', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      + İlk Kuryeyi Ekle
                    </button>
                  </td></tr>
                ) : (
                  carriers.map(carrier => (
                    <tr key={carrier.id} style={{ opacity: carrier.isActive ? 1 : 0.6 }}>
                      <td><span style={{ color: '#667eea', fontWeight: 600 }}>#{carrier.id}</span></td>
                      <td className={tableStyles.fontBold}>{carrier.fullName}</td>
                      <td><code style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px', fontSize: '13px' }}>{carrier.username}</code></td>
                      <td>
                        <div>{carrier.email}</div>
                        <div style={{fontSize: '12px', color: '#666'}}>{carrier.phoneNumber || '-'}</div>
                      </td>
                      <td>
                        {carrier.groups.length > 0 ? (
                          <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                            {carrier.groups.map(g => (
                              <span key={g.id} style={{
                                background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)', 
                                color: '#4338ca', 
                                padding: '3px 10px', 
                                borderRadius: '15px', 
                                fontSize: '12px',
                                fontWeight: 500
                              }}>
                                {g.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{color: '#9ca3af', fontStyle: 'italic', fontSize: '13px'}}>Bölge atanmamış</span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          padding: '5px 12px', 
                          borderRadius: '20px',
                          backgroundColor: carrier.isActive ? '#dcfce7' : '#fee2e2',
                          color: carrier.isActive ? '#166534' : '#991b1b',
                          fontSize: '12px',
                          fontWeight: 500
                        }}>
                          {carrier.isActive ? '✓ Aktif' : '✕ Pasif'}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#6b7280' }}>{formatDate(carrier.lastLoginDate)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleEditCarrier(carrier)}
                            style={{
                              padding: '6px 14px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            ✏️ Düzenle
                          </button>
                          <button 
                            onClick={() => handleToggleActive(carrier.id, carrier.isActive)}
                            style={{
                              padding: '6px 12px',
                              background: carrier.isActive ? '#fef3c7' : '#dcfce7',
                              color: carrier.isActive ? '#92400e' : '#166534',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: 500
                            }}
                          >
                            {carrier.isActive ? '⏸ Pasif Yap' : '▶ Aktif Yap'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shipments Tab */}
      {activeTab === 'shipments' && (
        <div className={styles.card}>
          <div style={{ overflowX: 'auto' }}>
            <table className={tableStyles.table}>
              <thead>
                <tr>
                  <th>Takip No</th>
                  <th>Gönderen</th>
                  <th>Alıcı</th>
                  <th>Kurye</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{textAlign: 'center', padding: '40px'}}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      <span style={{ width: '20px', height: '20px', border: '2px solid #667eea', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                      Yükleniyor...
                    </div>
                  </td></tr>
                ) : shipments.length === 0 ? (
                  <tr><td colSpan={7} style={{textAlign: 'center', padding: '40px', color: '#9ca3af'}}>
                    <div>📦 Henüz kargo kaydı bulunmuyor.</div>
                  </td></tr>
                ) : (
                  shipments.map(shipment => (
                    <tr key={shipment.id}>
                      <td><code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{shipment.trackingNumber}</code></td>
                      <td>{shipment.senderPharmacy}</td>
                      <td>{shipment.receiverPharmacy}</td>
                      <td>{shipment.carrierName || <span style={{color: '#9ca3af'}}>Atanmadı</span>}</td>
                      <td>{getStatusBadge(shipment.status)}</td>
                      <td style={{ fontSize: '13px', color: '#6b7280' }}>{formatDate(shipment.createdAt)}</td>
                      <td>
                        <button 
                          style={{
                            padding: '6px 14px',
                            background: '#f3f4f6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px'
                          }}
                        >
                          Detay
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live Tracking Tab */}
      {activeTab === 'liveTracking' && (
        <LiveCarrierMap />
      )}

      <CreateCarrierModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onSuccess={handleCreateSuccess}
        editingCarrier={editingCarrier}
      />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
