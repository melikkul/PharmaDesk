// src/app/(dashboard)/sepet/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

// Bileşenleri import et
import SettingsCard from '@/components/settings/SettingsCard';

// Verileri import et
import { pharmacyData } from '@/data/dashboardData';

// Stilleri import et
// DÜZELTME: dashboard.css yolunu (dashboard) içine al
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from './sepet.module.css'; 
// DÜZELTME: Stil yollarını (dashboard) içine al
import formStyles from '@/app/(dashboard)/ayarlar/profil/profil.module.css'; 
import toggleStyles from '@/app/(dashboard)/ayarlar/page.module.css'; 

// Tipler (TÜMÜ SİLİNDİ)

const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
const KARGO_UCRETI = 49.90;

export default function SepetPage() {
  const router = useRouter();
  const { cartItems, clearCart } = useCart(); 

  const [usePharmaDeskShipping, setUsePharmaDeskShipping] = useState(true);

  const cartTotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const kargoUcreti = usePharmaDeskShipping ? KARGO_UCRETI : 0;
  const genelToplam = cartTotal + kargoUcreti;

  // --- Standart Panel State Yönetimi SİLİNDİ ---
  // --- State Yönetimi Sonu ---

  const handleCompleteOrder = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Sipariş tamamlandı (Genel Toplam: ${genelToplam.toFixed(2)} ₺)!`);
    clearCart();
    router.push('/dashboard');
  };

  return (
    // <div className="dashboard-container"> // SİLİNDİ
    //   <Sidebar /> // SİLİNDİ
    //   <Header /> // SİLİNDİ
    //   <main className="main-content"> // SİLİNDİ
        <form onSubmit={handleCompleteOrder}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Siparişi Tamamla</h1>
            <Link href="/ilaclar" className={styles.backButton}>
              <BackIcon />
              <span>Alışverişe Devam Et</span>
            </Link>
          </div>

          <div className={styles.checkoutGrid}>
            <div className={styles.formColumn}>
              
              <SettingsCard
                title="Kargo Hizmeti"
                description="Siparişiniz için PharmaDesk kargo hizmetinden yararlanmak ister misiniz?"
              >
                <div className={toggleStyles.toggleList}>
                  <div className={toggleStyles.toggleItem}>
                    <span>PharmaDesk Kargo Hizmetini Kullan ({KARGO_UCRETI.toFixed(2)} ₺)</span>
                    <label className={toggleStyles.switch}>
                      <input 
                        type="checkbox" 
                        checked={usePharmaDeskShipping} 
                        onChange={(e) => setUsePharmaDeskShipping(e.target.checked)} 
                      />
                      <span className={`${toggleStyles.slider} ${toggleStyles.round}`}></span>
                    </label>
                  </div>
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
                      defaultValue={pharmacyData.location} 
                    ></textarea>
                  </div>
                  <div className={formStyles.formGroup}>
                    <label htmlFor="city">İl</label>
                    <input 
                      type="text" 
                      id="city" 
                      defaultValue={pharmacyData.city} 
                    />
                  </div>
                  <div className={formStyles.formGroup}>
                    <label htmlFor="district">İlçe</label>
                    <input 
                      type="text" 
                      id="district" 
                      defaultValue={pharmacyData.district} 
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
                  <button type="submit" className={styles.completeOrderButton} disabled={cartItems.length === 0}>
                    Siparişi Onayla ({genelToplam.toFixed(2)} ₺)
                  </button>
                }
              >
                <div className={styles.summaryItemList}>
                  {cartItems.length === 0 && <p>Sepetiniz boş.</p>}
                  {cartItems.map(item => (
                    <div key={`${item.product.id}-${item.sellerName}`} className={styles.summaryItem}>
                      <img src={item.product.imageUrl || '/dolorex_placeholder.png'} alt={item.product.name} />
                      <div className={styles.summaryItemDetails}>
                        <strong>{item.product.name}</strong>
                        <span>{item.quantity} x {item.product.price.toFixed(2)} ₺</span>
                        <span className={styles.summarySeller}>Satıcı: {item.sellerName}</span>
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
                <div className={`${styles.summaryTotal} ${styles.summarySubtotal}`}>
                  <span>Kargo Ücreti</span>
                  <strong>{kargoUcreti.toFixed(2)} ₺</strong>
                </div>
                <div className={styles.summaryTotal}>
                  <span>Genel Toplam</span>
                  <strong className={styles.finalTotal}>{genelToplam.toFixed(2)} ₺</strong>
                </div>
              </SettingsCard>
            </div>
          </div>
        </form>
    //   </main> // SİLİNDİ
    //   {/* --- Panel ve Modal Alanı SİLİNDİ --- */}
    // </div> // SİLİNDİ
  );
}