'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './groupDetail.module.css';

interface GroupMember {
  pharmacyId: string;
  pharmacyName: string;
  ownerName?: string;
  isActive: boolean;
  subscriptionStatus: string;
  subscriptionStartDate?: string;
  subscriptionExpireDate?: string;
  daysRemaining?: number;
  virtualBalance: number;
  balanceLimit?: number;
  totalSales: number;
  salesCount: number;
  totalPurchases: number;
  purchasesCount: number;
  estimatedProfit: number;
  discountPercent?: number;
  discountAmount?: number;
  // 🆕 New fields
  subscriptionMonths?: number;
  paymentStatus?: string;
}

interface GroupFinancial {
  groupId: number;
  groupName: string;
  cityName: string;
  totalMembers: number;
  activeSubscriptions: number;
  hasCustomPrice: boolean;
  customPrice?: number;
  hasCargoService: boolean;
  cargoPrice?: number;
  totalConfirmedPayments?: number; // 🆕 Actual confirmed payments
  members: GroupMember[];
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { api } = useAuth();
  const groupId = Number(params.id);

  const [data, setData] = useState<GroupFinancial | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable settings
  const [customPrice, setCustomPrice] = useState<string>('');
  const [hasCargoService, setHasCargoService] = useState(false);
  const [cargoPrice, setCargoPrice] = useState<string>('2450'); // 🆕 Configurable cargo price
  
  // 🆕 Member discounts (pharmacyId -> discount value)
  const [memberDiscounts, setMemberDiscounts] = useState<Record<string, { type: 'percent' | 'amount'; value: string }>>({});
  
  // 🆕 Balance operations
  const [balanceAdd, setBalanceAdd] = useState<Record<string, string>>({});
  const [balanceLimit, setBalanceLimit] = useState<Record<string, string>>({});
  
  // 🆕 Member Management Modal
  const [modalMember, setModalMember] = useState<GroupMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [customDays, setCustomDays] = useState<string>('30');

  useEffect(() => {
    if (groupId) {
      fetchGroupData();
    }
  }, [groupId]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/groups/${groupId}/financial`);
      const groupData: GroupFinancial = res.data;
      setData(groupData);
      
      // Initialize form values
      setCustomPrice(groupData.customPrice?.toString() || '');
      setHasCargoService(groupData.hasCargoService);
      setCargoPrice(groupData.cargoPrice?.toString() || '2450');
      
      // 🆕 Initialize member discounts
      const discounts: Record<string, { type: 'percent' | 'amount'; value: string }> = {};
      groupData.members.forEach(m => {
        if (m.discountPercent) {
          discounts[m.pharmacyId] = { type: 'percent', value: m.discountPercent.toString() };
        } else if (m.discountAmount) {
          discounts[m.pharmacyId] = { type: 'amount', value: m.discountAmount.toString() };
        }
      });
      setMemberDiscounts(discounts);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch group data');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePricing = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/api/groups/${groupId}/pricing`, {
        customSubscriptionPrice: customPrice ? Number(customPrice) : null,
        hasCargoService,
        cargoPrice: cargoPrice ? Number(cargoPrice) : 2450 // 🆕 Include cargo price
      });
      
      setSuccess('Fiyatlandırma ayarları güncellendi');
      fetchGroupData(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update pricing');
    } finally {
      setSaving(false);
    }
  };

  // 🆕 Handle member discount update
  const handleMemberDiscountSave = async (pharmacyId: string) => {
    const discount = memberDiscounts[pharmacyId];
    if (!discount) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/api/groups/admin/member-discount/${pharmacyId}`, {
        discountType: discount.type,
        discountValue: discount.value ? Number(discount.value) : 0
      });
      
      setSuccess(`${pharmacyId} için indirim kaydedildi`);
      fetchGroupData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'İndirim kaydedilemedi');
    } finally {
      setActionLoading(false);
    }
  };

  // 🆕 Handle balance add
  const handleBalanceAdd = async (pharmacyId: string) => {
    const amount = balanceAdd[pharmacyId];
    if (!amount || Number(amount) === 0) return;

    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post(`/api/groups/admin/add-balance/${pharmacyId}`, {
        amount: Number(amount)
      });
      
      setSuccess(`${Number(amount).toLocaleString('tr-TR')} ₺ bakiye eklendi`);
      setBalanceAdd(prev => ({ ...prev, [pharmacyId]: '' }));
      fetchGroupData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Bakiye eklenemedi');
    } finally {
      setActionLoading(false);
    }
  };

  // 🆕 Handle balance limit update
  const handleBalanceLimitUpdate = async (pharmacyId: string) => {
    const limit = balanceLimit[pharmacyId];
    
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/api/groups/admin/balance-limit/${pharmacyId}`, {
        balanceLimit: limit ? Number(limit) : 0
      });
      
      setSuccess(`Bakiye alt limiti güncellendi`);
      fetchGroupData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Limit güncellenemedi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubscriptionAction = async (pharmacyId: string, action: string, days?: number) => {
    setActionLoading(true);
    setModalMember(null); // Close modal
    setError('');
    setSuccess('');

    try {
      await api.put(`/api/groups/admin/subscription/${pharmacyId}`, {
        action,
        days: days || 30
      });
      
      setSuccess('Abonelik işlemi başarılı');
      fetchGroupData(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.error || 'İşlem başarısız');
    } finally {
      setActionLoading(false);
    }
  };

  const getSubscriptionBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <span className={`${styles.badge} ${styles.badgeSuccess}`}>🟢 Aktif</span>;
      case 'Trial':
        return <span className={`${styles.badge} ${styles.badgeWarning}`}>🟡 Deneme</span>;
      case 'PastDue':
        return <span className={`${styles.badge} ${styles.badgeDanger}`}>🔴 Ödeme Bekleniyor</span>;
      case 'Cancelled':
        return <span className={`${styles.badge} ${styles.badgeDanger}`}>⛔ İptal</span>;
      default:
        return <span className={`${styles.badge} ${styles.badgeGray}`}>{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Grup bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h2>Grup bulunamadı</h2>
          <button onClick={() => router.push('/groups')}>Gruplara Dön</button>
        </div>
      </div>
    );
  }

  // Calculate totals
  const cargoPriceNum = Number(cargoPrice) || 2450;
  const totalCargoRevenue = hasCargoService ? data.members.length * cargoPriceNum : 0;
  const basePrice = Number(customPrice) || data.customPrice || 400;
  const totalSubscriptionRevenue = data.members.length * basePrice;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => router.push('/groups')}>
          ← Gruplara Dön
        </button>
        <div className={styles.headerInfo}>
          <h1>{data.groupName}</h1>
          <p>📍 {data.cityName} • 👥 {data.totalMembers} Üye • ✅ {data.activeSubscriptions} Aktif Abonelik</p>
        </div>
      </header>

      {/* Alerts */}
      {error && (
        <div className={styles.alert + ' ' + styles.alertError}>
          ⚠️ {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}
      {success && (
        <div className={styles.alert + ' ' + styles.alertSuccess}>
          ✅ {success}
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {/* Admin Control Panel */}
      <section className={styles.controlPanel}>
        <h2>⚙️ Yönetici Kontrol Paneli</h2>
        
        <div className={styles.controlGrid}>
          {/* Pricing Control */}
          <div className={styles.controlCard}>
            <div className={styles.controlHeader}>
              <span className={styles.controlIcon}>💰</span>
              <h3>Abonelik Fiyatı</h3>
            </div>
            <p className={styles.controlDescription}>
              Bu gruba özel fiyat belirleyin. Boş bırakırsanız varsayılan 400 ₺ uygulanır.
            </p>
            <div className={styles.inputGroup}>
              <input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="Varsayılan (400 TL)"
                className={styles.priceInput}
              />
              <span className={styles.inputSuffix}>₺/ay</span>
            </div>
            {customPrice && (
              <p className={styles.priceNote}>
                ✨ Özel fiyat aktif: <strong>{Number(customPrice).toLocaleString('tr-TR')} ₺</strong>
              </p>
            )}
          </div>

          {/* Cargo Service - Same style as Subscription Pricing */}
          <div className={styles.controlCard}>
            <div className={styles.controlHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={styles.controlIcon}>🚚</span>
                <h3 style={{ margin: 0 }}>Kargo Hizmeti</h3>
              </div>
              {/* Toggle on top-right */}
              <label className={styles.toggleContainer} style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={hasCargoService}
                  onChange={(e) => setHasCargoService(e.target.checked)}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>
            <p className={styles.controlDescription}>
              PharmaDesk Kargo hizmetini bu grup için etkinleştirin. Pasifken kargo fiyatı yansıtılmaz.
            </p>
            <div className={styles.inputGroup}>
              <input
                type="number"
                value={cargoPrice}
                onChange={(e) => setCargoPrice(e.target.value)}
                placeholder="Varsayılan (2450 TL)"
                className={styles.priceInput}
                disabled={!hasCargoService}
                style={{ opacity: hasCargoService ? 1 : 0.5 }}
              />
              <span className={styles.inputSuffix}>₺/ay</span>
            </div>
            {hasCargoService && (
              <p className={styles.priceNote}>
                ✨ Kargo aktif: <strong>{Number(cargoPrice || 2450).toLocaleString('tr-TR')} ₺</strong> /üye/ay
              </p>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className={styles.controlActions}>
          <button 
            onClick={handleSavePricing}
            disabled={saving}
            className={styles.saveButton}
          >
            {saving ? 'Kaydediliyor...' : '💾 Değişiklikleri Kaydet'}
          </button>
        </div>

        {/* 🆕 Confirmed Payments (replacing estimated revenue) */}
        <div className={styles.revenuePreview}>
          <h4>💳 Onaylanan Ödemeler</h4>
          <div className={styles.revenueGrid}>
            <div className={styles.revenueItem + ' ' + styles.revenueTotal}>
              <span className={styles.revenueLabel}>Toplam Tahsilat</span>
              <span className={styles.revenueValue}>
                {(data?.totalConfirmedPayments || 0).toLocaleString('tr-TR')} ₺
              </span>
            </div>
          </div>
          {(!data?.totalConfirmedPayments || data.totalConfirmedPayments === 0) && (
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem', textAlign: 'center' }}>
              Henüz onaylanan ödeme bulunmuyor
            </p>
          )}
        </div>
      </section>

      {/* Members Financial Table */}
      <section className={styles.membersSection}>
        <h2>👥 Üye Yönetimi ({data.members.length} Üye)</h2>
        
        <div className={styles.membersList}>
          {data.members.map(member => (
            <div key={member.pharmacyId} className={styles.memberCard}>
              {/* Header */}
              <div className={styles.memberHeader}>
                <div className={styles.memberAvatar}>
                  {member.pharmacyName.charAt(0).toUpperCase()}
                </div>
                <div className={styles.memberInfo}>
                  <span className={styles.memberName}>{member.pharmacyName}</span>
                  {member.ownerName && (
                    <span className={styles.memberOwner}>👤 {member.ownerName}</span>
                  )}
                </div>
                {getSubscriptionBadge(member.subscriptionStatus)}
                
                {/* Member Management Button */}
                <button 
                  className={styles.manageButton}
                  onClick={() => setModalMember(member)}
                  disabled={actionLoading}
                >
                  ⚙️ Yönet
                </button>
              </div>
              
              {/* Subscription Details */}
              <div className={styles.memberDetails}>
                <div className={styles.detailRow}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>📆 Başlangıç</span>
                    <span className={styles.detailValue}>
                      {member.subscriptionStartDate 
                        ? new Date(member.subscriptionStartDate).toLocaleDateString('tr-TR')
                        : '-'
                      }
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>📅 Bitiş</span>
                    <span className={styles.detailValue}>
                      {member.subscriptionStatus === 'Cancelled' 
                        ? '-'
                        : member.subscriptionExpireDate 
                          ? new Date(member.subscriptionExpireDate).toLocaleDateString('tr-TR')
                          : '-'
                      }
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>⏰ Kalan</span>
                    <span className={`${styles.detailValue} ${
                      member.subscriptionStatus === 'Cancelled'
                        ? styles.daysExpired
                        : member.daysRemaining && member.daysRemaining > 7 
                          ? styles.daysOk 
                          : member.daysRemaining && member.daysRemaining > 0 
                            ? styles.daysWarning 
                            : styles.daysExpired
                    }`}>
                      {member.subscriptionStatus === 'Cancelled'
                        ? 'Süresi Doldu'
                        : member.daysRemaining && member.daysRemaining > 0 
                          ? `${member.daysRemaining} gün`
                          : 'Süresi Doldu'
                      }
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar for Days */}
                {member.daysRemaining && member.daysRemaining > 0 && (
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill}
                      style={{ 
                        width: `${Math.min(100, (member.daysRemaining / 30) * 100)}%`,
                        backgroundColor: member.daysRemaining > 7 ? '#22c55e' : '#f59e0b'
                      }}
                    ></div>
                  </div>
                )}
              </div>
              
              {/* Financial Stats */}
              <div className={styles.memberStats}>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>💰 Bakiye</span>
                  <span className={styles.statValue + ' ' + styles.statBlue}>
                    {member.virtualBalance.toLocaleString('tr-TR')} ₺
                  </span>
                  {/* 🆕 Only show limit if it's negative (credit limit) */}
                  {member.balanceLimit !== undefined && member.balanceLimit !== null && member.balanceLimit < 0 && (
                    <span style={{ fontSize: '0.65rem', color: '#8b5cf6' }}>
                      (limit: {member.balanceLimit} ₺)
                    </span>
                  )}
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>📈 Satış ({member.salesCount || 0} adet)</span>
                  <span className={styles.statValue}>
                    {member.totalSales.toLocaleString('tr-TR')} ₺
                  </span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>📉 Alım ({member.purchasesCount || 0} adet)</span>
                  <span className={styles.statValue}>
                    {member.totalPurchases.toLocaleString('tr-TR')} ₺
                  </span>
                </div>
                <div className={styles.statBox}>
                  <span className={styles.statLabel}>💎 Toplam Kar</span>
                  <span className={`${styles.statValue} ${
                    member.estimatedProfit >= 0 ? styles.statGreen : styles.statRed
                  }`}>
                    {member.estimatedProfit >= 0 ? '+' : ''}{member.estimatedProfit.toLocaleString('tr-TR')} ₺
                  </span>
                </div>
                {/* 🆕 Subscription Months */}
                {member.subscriptionMonths !== undefined && member.subscriptionMonths > 0 && (
                  <div className={styles.statBox} style={{ background: '#fef3c7', border: '1px solid #fcd34d' }}>
                    <span className={styles.statLabel}>📅 Abonelik Süresi</span>
                    <span className={styles.statValue} style={{ color: '#b45309' }}>
                      {member.subscriptionMonths} Ay
                    </span>
                  </div>
                )}
                {/* 🆕 Payment Status */}
                {member.paymentStatus && (
                  <div className={styles.statBox} style={{ 
                    background: member.paymentStatus === 'Ödendi' ? '#dcfce7' : '#fef9c3', 
                    border: `1px solid ${member.paymentStatus === 'Ödendi' ? '#86efac' : '#fde047'}` 
                  }}>
                    <span className={styles.statLabel}>💳 Ödeme Durumu</span>
                    <span className={styles.statValue} style={{ 
                      color: member.paymentStatus === 'Ödendi' ? '#15803d' : '#a16207' 
                    }}>
                      {member.paymentStatus}
                    </span>
                  </div>
                )}
                {/* Show discount badge if exists */}
                {(member.discountPercent || member.discountAmount) && (
                  <div className={styles.statBox} style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                    <span className={styles.statLabel}>🏷️ İndirim</span>
                    <span className={styles.statValue} style={{ color: '#0369a1' }}>
                      {member.discountPercent ? `%${member.discountPercent}` : `${member.discountAmount} ₺`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {data.members.length === 0 && (
            <div className={styles.emptyTable}>
              <p>Bu grupta henüz üye bulunmuyor</p>
            </div>
          )}
        </div>
      </section>

      {/* Member Management Modal */}
      {modalMember && (
        <div className={styles.modalOverlay} onClick={() => setModalMember(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Üye Yönetimi</h3>
                <p className={styles.modalSubtitle}>{modalMember.pharmacyName}</p>
              </div>
              <button className={styles.modalCloseBtn} onClick={() => setModalMember(null)}>✕</button>
            </div>

            {/* Form Body */}
            <div className={styles.modalBody}>
              
              {/* 1. Abonelik Süresi */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>📅 Abonelik Süresi Ekle</label>
                <div className={styles.formRow}>
                  <input
                    type="number"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder="30"
                    min="1"
                    className={styles.formInput}
                  />
                  <span className={styles.formUnit}>gün</span>
                  <button 
                    className={styles.formBtnSuccess}
                    onClick={() => handleSubscriptionAction(modalMember.pharmacyId, 'extend_days', Number(customDays) || 30)}
                    disabled={!customDays || Number(customDays) < 1 || actionLoading}
                  >
                    Ekle
                  </button>
                </div>
              </div>

              {/* 2. Bakiye Ekle */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>💰 Bakiye Ekle</label>
                <div className={styles.formRow}>
                  <input
                    type="number"
                    value={balanceAdd[modalMember.pharmacyId] || ''}
                    onChange={(e) => setBalanceAdd(prev => ({ ...prev, [modalMember.pharmacyId]: e.target.value }))}
                    placeholder="Tutar"
                    className={styles.formInput}
                  />
                  <span className={styles.formUnit}>₺</span>
                  <button 
                    className={styles.formBtnPrimary}
                    onClick={() => handleBalanceAdd(modalMember.pharmacyId)}
                    disabled={!balanceAdd[modalMember.pharmacyId] || Number(balanceAdd[modalMember.pharmacyId]) === 0 || actionLoading}
                  >
                    Ekle
                  </button>
                </div>
              </div>

              {/* 3. Bakiye Limiti */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>📉 Bakiye Alt Limiti</label>
                <div className={styles.formRow}>
                  <input
                    type="number"
                    value={balanceLimit[modalMember.pharmacyId] ?? (modalMember.balanceLimit?.toString() || '0')}
                    onChange={(e) => setBalanceLimit(prev => ({ ...prev, [modalMember.pharmacyId]: e.target.value }))}
                    placeholder="-500"
                    className={styles.formInput}
                  />
                  <span className={styles.formUnit}>₺</span>
                  <button 
                    className={styles.formBtnSecondary}
                    onClick={() => handleBalanceLimitUpdate(modalMember.pharmacyId)}
                    disabled={actionLoading}
                  >
                    Kaydet
                  </button>
                </div>
                <small className={styles.formHint}>Negatif değer girilebilir (örn: -500)</small>
              </div>

              {/* 4. Özel İndirim */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>🏷️ Özel İndirim</label>
                <div className={styles.formRow}>
                  <select
                    className={styles.formSelect}
                    value={memberDiscounts[modalMember.pharmacyId]?.type || 'percent'}
                    onChange={(e) => setMemberDiscounts(prev => ({
                      ...prev,
                      [modalMember.pharmacyId]: { 
                        type: e.target.value as 'percent' | 'amount', 
                        value: prev[modalMember.pharmacyId]?.value || '' 
                      }
                    }))}
                  >
                    <option value="percent">%</option>
                    <option value="amount">₺</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Değer"
                    value={memberDiscounts[modalMember.pharmacyId]?.value || ''}
                    onChange={(e) => setMemberDiscounts(prev => ({
                      ...prev,
                      [modalMember.pharmacyId]: { 
                        type: prev[modalMember.pharmacyId]?.type || 'percent', 
                        value: e.target.value 
                      }
                    }))}
                    className={styles.formInput}
                    min="0"
                  />
                  <button 
                    className={styles.formBtnWarning}
                    onClick={() => handleMemberDiscountSave(modalMember.pharmacyId)}
                    disabled={actionLoading}
                  >
                    Kaydet
                  </button>
                </div>
                {(modalMember.discountPercent || modalMember.discountAmount) && (
                  <small className={styles.formHint} style={{ color: '#16a34a' }}>
                    ✓ Mevcut: {modalMember.discountPercent ? `%${modalMember.discountPercent}` : `${modalMember.discountAmount} ₺`}
                  </small>
                )}
              </div>

              {/* Divider */}
              <hr className={styles.formDivider} />

              {/* Cancel Button */}
              <button 
                className={styles.formBtnDanger}
                onClick={() => handleSubscriptionAction(modalMember.pharmacyId, 'cancel')}
                disabled={actionLoading}
              >
                ⛔ Aboneliği İptal Et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
