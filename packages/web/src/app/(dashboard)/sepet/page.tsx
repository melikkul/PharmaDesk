// src/app/(dashboard)/sepet/page.tsx
'use client';

import React, { useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/store/CartContext';
import { useAuth } from '@/store/AuthContext';
import { cartService } from '@/services/cartService';

// Bileşenleri import et
import SettingsCard from '@/components/settings/SettingsCard';

// Stilleri import et
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './sepet.module.css'; 
import formStyles from '@/app/(dashboard)/ayarlar/profil/profil.module.css'; 

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;

const LockIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;

// 🆕 Helper: Parse image URL from various formats (JSON array, string, etc.)
const getImageUrl = (imageUrl: string | undefined): string => {
  if (!imageUrl) return '/placeholder-med.png';
  
  // Handle JSON array format: ["path1.jpg", "path2.jpg"]  
  if (imageUrl.startsWith('[')) {
    try {
      const paths = JSON.parse(imageUrl);
      if (Array.isArray(paths) && paths.length > 0) {
        return paths[0];
      }
    } catch {
      // JSON parse failed, use original
    }
  }
  
  return imageUrl;
};

export default function SepetPage() {
  const router = useRouter();
  const { cartItems, clearCart, loading, refreshCart, isUpdatingQuantity } = useCart(); 
  const { user, token } = useAuth();
  const [stocksLocked, setStocksLocked] = useState(false);
  const [lockExpiresAt, setLockExpiresAt] = useState<Date | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const hasLockedOnMount = useRef(false);
  
  // Sayfa yüklendiğinde sepeti yenile
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);
  
  // Bakiye ve sipariş durumu
  const [balance, setBalance] = useState<number | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [selfOrderLink, setSelfOrderLink] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  
  // 🆕 Address State Management
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');

  // 🆕 Update address fields when user data is loaded
  useEffect(() => {
    if (user) {
      setAddress(user.address || '');
      setCity(user.city || '');
      setDistrict(user.district || '');
    }
  }, [user]);

  const API_BASE_URL = '';

  // Kargo hizmeti admin tarafından tanımlanmış mı?
  const hasShippingService = user?.hasShippingService ?? false;

  // Ara toplam hesaplama
  const cartTotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cartItems]);

  // 🆕 Toplam kar hesaplama
  const totalProfit = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + (item.profitAmount || 0), 0);
  }, [cartItems]);

  const genelToplam = cartTotal;

  // Sayfa yüklendiğinde stokları kilitle
  useEffect(() => {
    const lockStocks = async () => {
      if (!token || cartItems.length === 0 || hasLockedOnMount.current) return;
      
      hasLockedOnMount.current = true;
      setIsLocking(true);
      
      try {
        const response = await cartService.lockStocks(token);
        setStocksLocked(true);
        setLockExpiresAt(new Date(response.expiresAt));
        console.log('[Sepet] Stoklar kilitlendi:', response.lockedOfferIds);
      } catch (err) {
        console.error('[Sepet] Stok kilitleme hatası:', err);
        // Hata olsa bile devam et
      } finally {
        setIsLocking(false);
      }
    };

    lockStocks();
  }, [token, cartItems.length]);

  // Sayfa kapatılırken veya çıkıldığında kilitleri serbest bırak
  useEffect(() => {
    const unlockStocks = () => {
      if (token && stocksLocked) {
        // fetch with keepalive - sayfa kapanırken bile tamamlanır
        const url = `${''}/api/stocklocks/unlock`;
        fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
          },
          keepalive: true, // Sayfa kapanırken de isteği tamamla
        }).catch(() => {
          // Hata olsa bile sessizce devam et
        });
        console.log('[Sepet] beforeunload: Kilit serbest bırakma isteği gönderildi');
      }
    };

    // beforeunload event'i
    window.addEventListener('beforeunload', unlockStocks);

    // Cleanup: sayfa unmount olduğunda
    return () => {
      window.removeEventListener('beforeunload', unlockStocks);
      
      // Component unmount olduğunda kilitleri serbest bırak
      if (token && stocksLocked) {
        cartService.unlockStocks(token).catch(err => {
          console.warn('[Sepet] Cleanup: Kilit serbest bırakma hatası:', err);
        });
      }
    };
  }, [token, stocksLocked]);

  // Kalan süreyi hesapla
  const getRemainingTime = useCallback(() => {
    if (!lockExpiresAt) return null;
    const now = new Date();
    const diff = lockExpiresAt.getTime() - now.getTime();
    if (diff <= 0) return null;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [lockExpiresAt]);

  const [remainingTime, setRemainingTime] = useState<string | null>(null);

  // Her saniye kalan süreyi güncelle
  useEffect(() => {
    if (!lockExpiresAt) return;

    const interval = setInterval(() => {
      const time = getRemainingTime();
      setRemainingTime(time);
      
      // Süre doldu
      if (!time) {
        setStocksLocked(false);
        setLockExpiresAt(null);
        hasLockedOnMount.current = false; // Tekrar kilitlenebilir
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockExpiresAt, getRemainingTime]);

  // Bakiye yükle
  useEffect(() => {
    const fetchBalance = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/transactions/balance`, {
          credentials: 'include',
          headers: token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (response.ok) {
          const data = await response.json();
          setBalance(data.balance);
        }
      } catch (err) {
        console.error('[Sepet] Bakiye yüklenemedi:', err);
      }
    };
    fetchBalance();
  }, [token, API_BASE_URL]);

  // Onay dialog'u göster
  const handleButtonClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowConfirmDialog(true);
  }, []);

  // Siparişi onayla
  const handleConfirmOrder = useCallback(async () => {
    // Double-click koruması - zaten işlem devam ediyorsa çık
    if (isOrdering) return;
    
    setShowConfirmDialog(false);
    setOrderError(null);
    setSelfOrderLink(null);
    setIsOrdering(true);
    
    try {
      // Sipariş oluştur - timeout ile AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 saniye timeout
      
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        // Kendi teklifine sipariş hatası
        if (data.selfOrderError) {
          setSelfOrderLink(data.editLink);
          setOrderError('Kendi teklifinize sipariş veremezsiniz.');
          setToast({ show: true, message: '❌ Kendi teklifinize sipariş veremezsiniz', type: 'error' });
          // Early return KALDIRILDI - finally block'a düşmesi için throw kullanıyoruz
          throw new Error('SELF_ORDER_ERROR'); // Handled error, just to exit try block
        }
        // Yetersiz bakiye
        if (data.insufficientBalance) {
          setOrderError(`Yetersiz bakiye. Mevcut: ${data.currentBalance?.toFixed(2)} ₺, Gerekli: ${data.requiredAmount?.toFixed(2)} ₺`);
          setToast({ show: true, message: '❌ Yetersiz bakiye', type: 'error' });
          throw new Error('INSUFFICIENT_BALANCE'); // Handled error
        }
        throw new Error(data.message || 'Sipariş oluşturulamadı');
      }

      // Başarılı - Kilitleri serbest bırak
      try {
        await cartService.unlockStocks(token!);
      } catch (unlockErr) {
        console.warn('[Sepet] Kilit serbest bırakma hatası:', unlockErr);
      }

      // Bakiyeyi güncelle
      setBalance(data.newBalance);

      // Başarı mesajı ve toast göster
      setToast({ show: true, message: `✅ ${data.message} - Ödenen: ${data.totalPaid?.toFixed(2)} ₺`, type: 'success' });
      await clearCart();
      
      // 2 saniye sonra yönlendir
      setTimeout(() => {
        router.push('/siparisler');
      }, 2000);
    } catch (err: unknown) {
      // AbortError (timeout) kontrolü
      if (err instanceof Error && err.name === 'AbortError') {
        console.error('[Sepet] İstek zaman aşımına uğradı');
        setOrderError('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
        setToast({ show: true, message: '❌ Bağlantı zaman aşımı', type: 'error' });
      } 
      // Handled errors (self order, insufficient balance) - already set error state above
      else if (err instanceof Error && (err.message === 'SELF_ORDER_ERROR' || err.message === 'INSUFFICIENT_BALANCE')) {
        // Error state already set, just log
        console.log('[Sepet] Handled order error:', err.message);
      }
      // Unexpected errors
      else {
        const errorMessage = err instanceof Error ? err.message : 'Sipariş oluşturulurken bir hata oluştu.';
        console.error('[Sepet] Sipariş hatası:', err);
        setOrderError(errorMessage);
        setToast({ show: true, message: '❌ Sipariş oluşturulamadı', type: 'error' });
      }
    } finally {
      // ✅ KRITIK: Bu blok HER ZAMAN çalışır - loading state temizlenir
      setIsOrdering(false);
    }
  }, [token, clearCart, router, API_BASE_URL, isOrdering]);

  // İptal
  const handleCancelOrder = useCallback(() => {
    setShowConfirmDialog(false);
    setToast({ show: true, message: 'Sipariş iptal edildi', type: 'error' });
  }, []);

  // Toast'u kapat (3 saniye sonra)
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Siparişi Tamamla</h1>
        <Link href="/ilaclar" className={styles.backButton}>
          <BackIcon />
          <span>Alışverişe Devam Et</span>
        </Link>
      </div>

      {/* Stok Kilidi Durumu */}
      {stocksLocked && remainingTime && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 20px',
          backgroundColor: '#dcfce7',
          borderRadius: '12px',
          border: '2px solid #22c55e',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '14px'
        }}>
          <LockIcon />
          <div>
            <strong style={{ color: '#166534' }}>Stoklar Kilitli</strong>
            <span style={{ marginLeft: '8px', color: '#15803d' }}>
              Sepetinizdeki ürünler {remainingTime} süre boyunca sizin için ayrıldı.
            </span>
          </div>
        </div>
      )}

      {isLocking && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 20px',
          backgroundColor: '#fef3c7',
          borderRadius: '12px',
          border: '2px solid #f59e0b',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '14px'
        }}>
          <span style={{ fontSize: '16px' }}>⏳</span>
          <span style={{ color: '#b45309' }}>Stoklar kilitleniyor...</span>
        </div>
      )}

      {/* ⚠️ Hata Mesajları */}
      {orderError && (
        <div style={{
          marginBottom: '20px',
          padding: '16px 20px',
          backgroundColor: '#fef2f2',
          borderRadius: '12px',
          border: '2px solid #ef4444',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          fontSize: '14px'
        }}>
          <span style={{ fontSize: '20px' }}>❌</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', color: '#b91c1c', marginBottom: '4px' }}>{orderError}</div>
            {selfOrderLink && (
              <Link 
                href={selfOrderLink}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '8px',
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textDecoration: 'none'
                }}
              >
                ✏️ Teklifi Düzenle
              </Link>
            )}
          </div>
        </div>
      )}

      <div className={styles.checkoutGrid}>
        <div className={styles.formColumn}>
          
          {/* Kargo Hizmeti Bilgisi */}
          <SettingsCard
            title="Kargo Hizmeti"
            description="PharmaDesk kargo hizmeti durumu"
          >
            <div style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: hasShippingService ? '#dcfce7' : '#f1f5f9',
              border: hasShippingService ? '2px solid #22c55e' : '2px solid #e2e8f0',
              textAlign: 'center'
            }}>
              {hasShippingService ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>✅</span>
                  <div>
                    <div style={{ fontWeight: '700', color: '#166534', fontSize: '16px' }}>
                      PharmaDesk Kargo Hizmeti Aktif
                    </div>
                    <div style={{ fontSize: '13px', color: '#15803d', marginTop: '2px' }}>
                      Hesabınız için kargo hizmeti tanımlanmıştır
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>📦</span>
                  <div>
                    <div style={{ fontWeight: '600', color: '#64748b', fontSize: '15px' }}>
                      Kargo Hizmeti Tanımlı Değil
                    </div>
                    <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                      Kargo hizmeti için yöneticinize başvurun
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SettingsCard>

          <SettingsCard
            title="Teslimat Adresi"
            description="Siparişin teslim edileceği adres."
          >
            <div className={formStyles.formGrid}>
              <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`}>
                <label htmlFor="address">Adres</label>
                <textarea 
                  id="address" 
                  rows={3} 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Teslimat adresi giriniz..."
                ></textarea>
              </div>
              <div className={formStyles.formGroup}>
                <label htmlFor="city">İl</label>
                <input 
                  type="text" 
                  id="city" 
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="İl giriniz..."
                />
              </div>
              <div className={formStyles.formGroup}>
                <label htmlFor="district">İlçe</label>
                <input 
                  type="text" 
                  id="district" 
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="İlçe giriniz..."
                />
              </div>
            </div>
          </SettingsCard>

        </div>

        <div className={styles.summaryColumn}>
          <SettingsCard
            title="Sipariş Özeti"
            description={`${cartItems.length} adet ürün sepetinizde.`}
            footer={
              <button 
                type="button" 
                onClick={handleButtonClick}
                className={styles.completeOrderButton} 
                disabled={
                  cartItems.length === 0 || 
                  loading || 
                  isOrdering || 
                  isUpdatingQuantity || // Miktar güncellenirken butonu kilitle
                  (balance !== null && balance < genelToplam)
                }
                style={{
                  opacity: (balance !== null && balance < genelToplam) || isUpdatingQuantity ? 0.5 : 1,
                  cursor: (balance !== null && balance < genelToplam) || isUpdatingQuantity ? 'not-allowed' : 'pointer'
                }}
              >
                {isOrdering ? 'Sipariş oluşturuluyor...' : 
                 isUpdatingQuantity ? 'Miktarlar güncelleniyor...' :
                 loading ? 'İşleniyor...' : 
                 (balance !== null && balance < genelToplam) ? 'Yetersiz Bakiye' :
                 `Siparişi Onayla (${genelToplam.toFixed(2)} ₺)`}
              </button>
            }
          >
            {/* Depo sorumlusu uyarısı */}
            {cartItems.some(item => item.isDepotSelfOrder) && (
              <div style={{
                marginBottom: '16px',
                padding: '12px 16px',
                backgroundColor: '#fef3c7',
                color: '#b45309',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                border: '2px solid #f59e0b',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px'
              }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: '700', marginBottom: '4px' }}>Dikkat: Depo Sorumluluğu</div>
                  <div style={{ fontWeight: '500', fontSize: '13px' }}>
                    Bazı ürünler için depodan siparişi siz vereceksiniz. 
                    Lütfen sipariş sonrası gerekli işlemleri yapmayı unutmayın.
                  </div>
                </div>
              </div>
            )}
            <div className={styles.summaryItemList}>
              {cartItems.length === 0 && <p>Sepetiniz boş.</p>}
              {cartItems.map(item => (
                <div key={`${item.product.id}-${item.sellerName}`} className={styles.summaryItem}>
                  {/* 🆕 Enhanced image with fallback handler */}
                  <img 
                    src={getImageUrl(item.product.imageUrl)} 
                    alt={item.product.name}
                    onError={(e) => { e.currentTarget.src = '/placeholder-med.png'; }}
                  />
                  <div className={styles.summaryItemDetails}>
                    <strong>{item.product.name}</strong>
                    {/* Teklif türü badge'i */}
                    {item.offerType && (
                      <span style={{
                        display: 'inline-block',
                        marginTop: '8px',
                        marginBottom: '6px',
                        padding: '3px 10px',
                        borderRadius: '10px',
                        fontSize: '10px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px',
                        backgroundColor: item.offerType.toLowerCase() === 'jointorder' ? '#f97316' 
                          : item.offerType.toLowerCase() === 'purchaserequest' ? '#8b5cf6' 
                          : '#10b981',
                        color: 'white'
                      }}>
                        {item.offerType.toLowerCase() === 'jointorder' ? 'Ortak Sipariş' 
                          : item.offerType.toLowerCase() === 'purchaserequest' ? 'Alım Talebi' 
                          : 'Stok Satışı'}
                      </span>
                    )}
                    <span>{item.quantity} x {item.product.price.toFixed(2)} ₺</span>
                    {/* 🆕 Kar bilgisi */}
                    {(item.profitAmount ?? 0) > 0 && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '4px',
                        padding: '3px 8px',
                        backgroundColor: '#dcfce7',
                        color: '#16a34a',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        💰 +{(item.profitAmount || 0).toFixed(2)} ₺ kar
                      </span>
                    )}
                    <span className={styles.summarySeller}>Satıcı: {item.sellerName}</span>
                    {/* Depodan ben söyleyeceğim uyarısı */}
                    {item.isDepotSelfOrder && (
                      <div style={{
                        marginTop: '6px',
                        padding: '4px 10px',
                        backgroundColor: '#fef3c7',
                        color: '#b45309',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        border: '1px solid #f59e0b'
                      }}>
                        📦 Depodan siz söyleyeceksiniz
                      </div>
                    )}
                  </div>
                  <strong className={styles.summaryItemTotal}>
                    {(item.quantity * item.product.price).toFixed(2)} ₺
                  </strong>
                </div>
              ))}
            </div>
            
            <div className={`${styles.summaryTotal} ${styles.summarySubtotal}`}>
              <span>Ara Toplam</span>
              <strong>{cartTotal.toFixed(2)} ₺</strong>
            </div>
            {/* 🆕 Toplam Kar */}
            {totalProfit > 0 && (
              <div className={`${styles.summaryTotal} ${styles.summarySubtotal}`} style={{ color: '#16a34a' }}>
                <span>💰 Toplam Kar (Barem)</span>
                <strong style={{ color: '#16a34a' }}>+{totalProfit.toFixed(2)} ₺</strong>
              </div>
            )}
            {/* Kargo Hizmeti */}
            {hasShippingService && (
              <div className={`${styles.summaryTotal} ${styles.summarySubtotal}`} style={{ color: '#16a34a' }}>
                <span>🚚 PharmaDesk Kargo</span>
                <strong style={{ color: '#16a34a' }}>Ücretsiz</strong>
              </div>
            )}
            <div className={styles.summaryTotal}>
              <span>Genel Toplam</span>
              <strong className={styles.finalTotal}>{genelToplam.toFixed(2)} ₺</strong>
            </div>

            {/* 💰 Bakiye Bilgisi */}
            {typeof balance === 'number' && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: '12px',
                color: 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', opacity: 0.9 }}>Mevcut Bakiye</span>
                  <strong style={{ fontSize: '16px' }}>{balance.toFixed(2)} ₺</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', opacity: 0.9 }}>Sipariş Sonrası</span>
                  <strong style={{ 
                    fontSize: '16px',
                    color: balance >= genelToplam ? '#86efac' : '#fca5a5'
                  }}>
                    {(balance - genelToplam).toFixed(2)} ₺
                  </strong>
                </div>
              </div>
            )}
          </SettingsCard>
        </div>
      </div>

      {/* 📣 Onay Dialog'u */}
      {showConfirmDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>
              Siparişi Onaylıyor musunuz?
            </h3>
            <p style={{ marginBottom: '8px', color: '#6b7280', fontSize: '14px' }}>
              Toplam tutar: <strong style={{ color: '#1d4ed8' }}>{genelToplam.toFixed(2)} ₺</strong>
            </p>
            <p style={{ marginBottom: '24px', color: '#6b7280', fontSize: '14px' }}>
              Bakiyenizden düşülecektir.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleCancelOrder}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  backgroundColor: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Hayır, Vazgeç
              </button>
              <button
                onClick={handleConfirmOrder}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#22c55e',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Evet, Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📣 Toast Bildirimi */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '16px 24px',
          borderRadius: '12px',
          backgroundColor: toast.type === 'success' ? '#22c55e' : '#ef4444',
          color: 'white',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          zIndex: 1001,
          animation: 'slideIn 0.3s ease'
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}