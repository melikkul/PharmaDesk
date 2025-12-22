"use client";

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import PaymentFormWrapper from '@/components/subscription/PaymentFormWrapper';
import { useAuth } from '@/store/AuthContext';
import Image from 'next/image';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface SubscriptionPlan {
  status: string;
  planType: string;
  priceToPayMonthly: number;
  basePrice: number;
  cargoPrice: number;
  hasCargoService: boolean;
  hasCustomPrice: boolean;
  expireDate: string | null;
  daysRemaining: number | null;
  lastPaymentDate: string | null;
  groupNames: string[];
}

type PaymentProvider = 'iyzico' | 'paytr' | 'param' | 'papara';

// ═══════════════════════════════════════════════════════════════
// PAYMENT PROVIDERS CONFIG (Türkiye Ödeme Sistemleri)
// ═══════════════════════════════════════════════════════════════

const PAYMENT_PROVIDERS: { id: PaymentProvider; name: string; logo: string; available: boolean }[] = [
  { id: 'iyzico', name: 'iyzico', logo: '/payment/iyzico.svg', available: true },
  { id: 'paytr', name: 'PayTR', logo: '/payment/paytr.svg', available: false },
  { id: 'param', name: 'Param', logo: '/payment/param.svg', available: false },
  { id: 'papara', name: 'Papara', logo: '/payment/papara.svg', available: false },
];

// ═══════════════════════════════════════════════════════════════
// FEATURES LIST
// ═══════════════════════════════════════════════════════════════

const FEATURES = [
  'Sınırsız ilaç envanter yönetimi',
  'Teklif oluşturma ve takip',
  'Sipariş yönetim sistemi',
  'Eczaneler arası transfer',
  'Finansal raporlar ve analiz',
  'Grup istatistikleri',
  'Gerçek zamanlı bildirimler',
  '7/24 teknik destek',
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AbonelikPage() {
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('iyzico');
  const { user } = useAuth();

  // 🆕 Calculate total price - cargo only included when admin enables it
  const calculateTotalPrice = () => {
    if (!plan) return 0;
    let total = plan.basePrice;
    if (plan.hasCargoService) {
      total += plan.cargoPrice || 0;
    }
    return total;
  };

  // Check for redirect reason from middleware
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'subscription_required') {
      setError('Bu sayfaya erişmek için aktif abonelik gereklidir.');
    }
  }, []);

  useEffect(() => {
    fetchMyPlan();
  }, []);

  // 🆕 Listen for real-time subscription updates from admin panel via SignalR
  useEffect(() => {
    const handleSubscriptionUpdate = (event: CustomEvent) => {
      console.log('[Abonelik] Subscription updated via SignalR:', event.detail);
      fetchMyPlan(); // Refetch plan data
    };

    window.addEventListener('subscriptionUpdated', handleSubscriptionUpdate as EventListener);
    
    return () => {
      window.removeEventListener('subscriptionUpdated', handleSubscriptionUpdate as EventListener);
    };
  }, []);

  const fetchMyPlan = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscription/my-plan', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Plan bilgisi alınamadı');
      }

      const data = await response.json();
      setPlan(data);
      
      // Show payment form if subscription is not active
      if (data.status !== 'Active') {
        setShowPayment(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    window.location.reload();
  };

  // ═══════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Abonelik bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  const isActive = plan?.status === 'Active';

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className={styles.container}>
      {/* Error Banner */}
      {error && (
        <div className={styles.errorBanner}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.currentStatus}>
          <span className={`${styles.statusDot} ${isActive ? styles.statusDotActive : styles.statusDotInactive}`}></span>
          <span className={styles.statusText}>
            Mevcut Durum: {isActive ? 'Aktif ✓' : plan?.status === 'Trial' ? 'Deneme Süresi' : 'Pasif'}
          </span>
          {isActive && plan?.daysRemaining && (
            <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>
              ({plan.daysRemaining} gün kaldı)
            </span>
          )}
        </div>
        
        <h1 className={styles.heroTitle}>
          {isActive ? 'Abonelik Durumunuz' : 'PharmaDesk Premium'}
        </h1>
        <p className={styles.heroSubtitle}>
          {isActive 
            ? 'Aktif aboneliğiniz aşağıda görüntülenmektedir.'
            : 'Türkiye\'nin en kapsamlı eczane yönetim platformuna tam erişim.'
          }
        </p>
      </section>

      {/* 🆕 Active Subscription Card - Only for active users */}
      {isActive && plan && (
        <div style={{
          maxWidth: '800px',
          margin: '0 auto 2rem',
          padding: '2rem',
          background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          borderRadius: '20px',
          color: 'white',
          boxShadow: '0 10px 40px rgba(16, 185, 129, 0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '2.5rem' }}>✅</span>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                Aktif Aboneliğiniz Var
              </h2>
              <p style={{ margin: '0.25rem 0 0', opacity: 0.9 }}>
                {plan.hasCargoService ? 'Premium + Kargo Hizmeti' : 'Premium Plan'}
              </p>
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
            gap: '1rem',
            marginBottom: '1.5rem' 
          }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Bitiş Tarihi</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {plan.expireDate ? new Date(plan.expireDate).toLocaleDateString('tr-TR') : '-'}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Kalan Süre</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {plan.daysRemaining ?? 0} gün
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Plan Ücreti</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {calculateTotalPrice().toLocaleString('tr-TR')} ₺/ay
              </div>
            </div>
            {plan.groupNames && plan.groupNames.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.15)', padding: '1rem', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Grup</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {plan.groupNames.join(', ')}
                </div>
              </div>
            )}
          </div>

          <div style={{ 
            padding: '1rem', 
            background: 'rgba(255,255,255,0.1)', 
            borderRadius: '10px',
            fontSize: '0.9rem',
            textAlign: 'center'
          }}>
            💡 Aboneliğiniz bittiğinde otomatik olarak yenileyebilirsiniz.
          </div>
        </div>
      )}

      {/* Renewal Section Header for Active Users */}
      {isActive && (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            color: '#64748b', 
            fontWeight: 600,
            borderTop: '1px solid #e2e8f0',
            paddingTop: '2rem',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            📅 Süre Uzatmak İsterseniz
          </h2>
        </div>
      )}

      {/* Main Grid */}
      <div className={styles.mainGrid}>
        {/* LEFT: Pricing Card */}
        <div className={styles.pricingCard}>
          <div className={styles.pricingHeader}>
            <span className={styles.pricingBadge}>🎯 En Popüler</span>
            <h2 className={styles.pricingTitle}>
              {plan?.hasCargoService ? 'Premium + Kargo' : 'Premium Plan'}
            </h2>
            <p className={styles.pricingSubtitle}>
              Tam özellikli eczane yönetim sistemi
            </p>
          </div>

          {/* Price Display */}
          <div className={styles.priceDisplay}>
            <div className={styles.priceWrapper}>
              <span className={styles.currency}>₺</span>
              <span className={styles.priceAmount}>
                {calculateTotalPrice().toLocaleString('tr-TR')}
              </span>
              <span className={styles.pricePeriod}>/ay</span>
            </div>
            <p className={styles.priceNote}>
              {plan?.hasCustomPrice && '✨ Grup özel fiyatı uygulanıyor'}
            </p>
          </div>

          {/* Price Breakdown */}
          <div className={styles.priceBreakdown}>
            <h3 className={styles.breakdownTitle}>Fiyat Detayı</h3>
            
            <div className={styles.breakdownItem}>
              <span className={styles.breakdownLabel}>
                <span className={styles.breakdownLabelIcon}>📦</span>
                Temel Abonelik
              </span>
              <span className={styles.breakdownValue}>
                {plan?.basePrice?.toLocaleString('tr-TR')} ₺
              </span>
            </div>

            {/* 🆕 Cargo Service - Only shown when enabled by admin (mandatory) */}
            {plan?.hasCargoService && (
              <div className={styles.breakdownItem} style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '0.75rem', borderRadius: '8px', marginTop: '0.5rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <span className={styles.breakdownLabel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={styles.breakdownLabelIcon}>🚚</span>
                  Kargo Hizmeti
                  <span style={{ fontSize: '0.7rem', background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>Zorunlu</span>
                </span>
                <span className={styles.breakdownValue} style={{ color: '#10b981', fontWeight: 600 }}>
                  +{plan?.cargoPrice?.toLocaleString('tr-TR') || 0} ₺
                </span>
              </div>
            )}
          </div>

          {/* Features List */}
          <div className={styles.featuresList}>
            <h3 className={styles.featuresTitle}>Dahil Özellikler</h3>
            {FEATURES.map((feature, index) => (
              <div key={index} className={styles.featureItem}>
                <span className={styles.featureCheck}>✓</span>
                <span>{feature}</span>
              </div>
            ))}
            {plan?.hasCargoService && (
              <div className={styles.featureItem}>
                <span className={styles.featureCheck}>🚚</span>
                <span>PharmaDesk Kargo Entegrasyonu</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Payment Section */}
        <div className={styles.paymentSection}>
          {/* Payment Method Selector */}
          <div className={styles.paymentMethods}>
            <h3 className={styles.paymentMethodsTitle}>Ödeme Yöntemi Seçin</h3>
            <div className={styles.paymentMethodGrid}>
              {PAYMENT_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  className={`${styles.paymentMethod} ${selectedProvider === provider.id ? styles.paymentMethodActive : ''}`}
                  onClick={() => provider.available && setSelectedProvider(provider.id)}
                  disabled={!provider.available}
                  style={{ opacity: provider.available ? 1 : 0.5 }}
                >
                  {/* Placeholder for logo - use text until logos are added */}
                  <div style={{ 
                    height: '32px', 
                    display: 'flex', 
                    alignItems: 'center',
                    fontWeight: 600,
                    color: provider.available ? '#6366f1' : '#94a3b8'
                  }}>
                    {provider.name}
                  </div>
                  <span className={styles.paymentMethodName}>
                    {provider.available ? 'Kullanılabilir' : 'Yakında'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Trust Badges */}
          <div className={styles.trustBadges}>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}>🔒</span>
              <span>SSL Güvenli</span>
            </div>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}>✅</span>
              <span>3D Secure</span>
            </div>
            <div className={styles.trustBadge}>
              <span className={styles.trustIcon}>🛡️</span>
              <span>PCI DSS</span>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.statsSection}>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>500+</div>
              <div className={styles.statLabel}>Aktif Eczane</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statNumber}>%99.9</div>
              <div className={styles.statLabel}>Uptime</div>
            </div>
          </div>

          {/* Payment Form or CTA Button */}
          {showPayment ? (
            <div className={styles.paymentFormCard}>
              <h3 className={styles.paymentFormTitle}>
                💳 Kart Bilgileri
              </h3>
              <PaymentFormWrapper 
                amount={calculateTotalPrice()}
                onSuccess={handlePaymentSuccess}
                onCancel={() => setShowPayment(false)}
              />
            </div>
          ) : (
            <button 
              className={styles.ctaButton}
              onClick={() => setShowPayment(true)}
            >
              <span className={styles.ctaButtonIcon}>🚀</span>
              {isActive ? 'Süre Uzat' : 'Hemen Başla'}
            </button>
          )}
        </div>
      </div>

      {/* Payment Providers Info */}
      <div className={styles.providersInfo}>
        <p className={styles.providersTitle}>Güvenli Ödeme Altyapısı</p>
        <div className={styles.providersGrid}>
          <span style={{ fontWeight: 600, color: '#6366f1' }}>iyzico</span>
          <span style={{ fontWeight: 600 }}>PayTR</span>
          <span style={{ fontWeight: 600 }}>Param</span>
          <span style={{ fontWeight: 600 }}>Papara</span>
        </div>
      </div>
    </div>
  );
}
