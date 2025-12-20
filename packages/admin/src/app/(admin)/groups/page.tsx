'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './groups.module.css';

interface Group {
  id: number;
  name: string;
  description?: string;
  cityName: string;
  memberCount: number;
  activeSubscriptions: number;
  hasCustomPrice: boolean;
  customPrice?: number;
  hasCargoService: boolean;
}

interface City {
  id: number;
  name: string;
  plateCode: string | null;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  
  const router = useRouter();
  const { api } = useAuth();

  useEffect(() => {
    fetchGroups();
    fetchCities();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/groups/admin/all');
      setGroups(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const res = await api.get('/api/locations/cities');
      setCities(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCityId || !groupName) return;

    setModalLoading(true);
    try {
      await api.post('/api/groups', {
        name: groupName,
        description: groupDescription,
        cityId: selectedCityId
      });

      // Reset form and refresh
      setGroupName('');
      setGroupDescription('');
      setSelectedCityId(null);
      setShowModal(false);
      fetchGroups();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create group');
    } finally {
      setModalLoading(false);
    }
  };

  const navigateToGroup = (groupId: number) => {
    router.push(`/groups/${groupId}`);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Gruplar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1>🏢 Grup & Bayi Yönetimi</h1>
          <p>Eczane gruplarını yönetin, fiyatlandırma ve kargo ayarlarını yapılandırın</p>
        </div>
        <button 
          className={styles.addButton}
          onClick={() => setShowModal(true)}
        >
          + Yeni Grup Ekle
        </button>
      </header>

      {error && (
        <div className={styles.errorBanner}>
          <span>⚠️</span> {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Stats Bar */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{groups.length}</span>
          <span className={styles.statLabel}>Toplam Grup</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>
            {groups.reduce((sum, g) => sum + g.memberCount, 0)}
          </span>
          <span className={styles.statLabel}>Toplam Üye</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>
            {groups.reduce((sum, g) => sum + g.activeSubscriptions, 0)}
          </span>
          <span className={styles.statLabel}>Aktif Abonelik</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>
            {groups.filter(g => g.hasCargoService).length}
          </span>
          <span className={styles.statLabel}>Kargo Aktif</span>
        </div>
      </div>

      {/* Groups Grid */}
      <div className={styles.groupsGrid}>
        {groups.map(group => (
          <div 
            key={group.id} 
            className={styles.groupCard}
            onClick={() => navigateToGroup(group.id)}
          >
            <div className={styles.cardHeader}>
              <h3>{group.name}</h3>
              <span className={styles.memberBadge}>
                👥 {group.memberCount}
              </span>
            </div>
            
            <div className={styles.cardBody}>
              <p className={styles.cityInfo}>📍 {group.cityName}</p>
              <p className={styles.subscriptionInfo}>
                ✅ {group.activeSubscriptions} / {group.memberCount} aktif abonelik
              </p>
            </div>
            
            <div className={styles.cardFooter}>
              <span className={`${styles.badge} ${group.hasCargoService ? styles.badgeGreen : styles.badgeGray}`}>
                🚚 {group.hasCargoService ? 'Kargo Aktif' : 'Kargo Pasif'}
              </span>
              <span className={`${styles.badge} ${group.hasCustomPrice ? styles.badgeBlue : styles.badgeGray}`}>
                💰 {group.hasCustomPrice ? `${group.customPrice?.toLocaleString('tr-TR')} ₺` : 'Standart'}
              </span>
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div className={styles.emptyState}>
            <p>Henüz grup oluşturulmamış</p>
            <button onClick={() => setShowModal(true)}>
              İlk Grubunuzu Oluşturun
            </button>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Yeni Grup Oluştur</h2>
              <button onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreateGroup} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>İl Seçin *</label>
                <select
                  value={selectedCityId || ''}
                  onChange={(e) => setSelectedCityId(Number(e.target.value))}
                  required
                >
                  <option value="">İl seçiniz...</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Grup Adı *</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Örn: Ankara Eczacıları"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Açıklama (Opsiyonel)</label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Grup hakkında açıklama..."
                  rows={3}
                />
              </div>

              <div className={styles.modalFooter}>
                <button 
                  type="button" 
                  className={styles.cancelButton}
                  onClick={() => setShowModal(false)}
                >
                  İptal
                </button>
                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Oluşturuluyor...' : 'Grup Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}