// src/components/ilaclar/ProductCard.tsx
import React from 'react';
import Link from 'next/link';
import { PharmacyLink, PriceDisplay } from '@/components/common';
import type { ShowroomMedication } from '../../lib/dashboardData';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  medication: ShowroomMedication & { malFazlasi?: string };
  linkHref?: string; // Özel link URL'i (barem parametresi için)
  extraSellerCount?: number; // 2'den fazla eczane varsa kalan sayı
  offerType?: string; // 🆕 Teklif türü: stocksale, jointorder, purchaserequest
}

// 🆕 Offer type badge color mapping
const offerTypeBadgeConfig: Record<string, { bg: string; text: string; label: string }> = {
  stocksale: { bg: '#10b981', text: 'white', label: 'Stok Satışı' },
  jointorder: { bg: '#f97316', text: 'white', label: 'Ortak Sipariş' },
  purchaserequest: { bg: '#8b5cf6', text: 'white', label: 'Alım Talebi' } // 🆕 Mor renk
};

const ProductCard: React.FC<ProductCardProps> = ({ medication, linkHref, extraSellerCount = 0, offerType }) => {
  // Link URL - özel veya varsayılan
  const href = linkHref || `/ilaclar/${medication.id}`;
  // Kalan stok hesapla: remainingStock varsa kullan, yoksa currentStock - soldQuantity
  const soldQty = medication.soldQuantity ?? 0;
  const remainingStock = medication.remainingStock ?? (medication.currentStock - soldQty);
  
  const isOutOfStock = remainingStock === 0;
  
  // MalFazlası parsing - "20+2" formatından bonus'u al
  const parseMF = (mf: string | undefined): { min: number; bonus: number } => {
    if (!mf || mf === '0+0') return { min: 0, bonus: 0 };
    const parts = mf.split('+').map(s => parseInt(s.trim()) || 0);
    return { min: parts[0] || 0, bonus: parts[1] || 0 };
  };
  
  const mfData = parseMF(medication.malFazlasi);
  const isJointOrder = offerType?.toLowerCase() === 'jointorder';
  const isPurchaseRequest = offerType?.toLowerCase() === 'purchaserequest'; // 🆕
  
  // Stok doluluk oranı hesapla
  // Joint Order ve PurchaseRequest için: talep edilen / barem toplam (doluluk)
  // Diğerleri için: (Stok - Alınan) / Stok (kalan)
  const totalStock = medication.currentStock || 1;
  let barWidth: number;
  let barColor: string;
  let barLabel: string = '';
  
  if ((isJointOrder || isPurchaseRequest) && mfData.min > 0) {
    // 🆕 JointOrder/PurchaseRequest: barem doluluk oranı  
    // Bar toplam baremi temsil ediyor, doluluk = talep edilen miktar
    const baremTotal = mfData.min + mfData.bonus;
    const requestedStock = medication.currentStock; // Bu teklifin talep ettiği stok
    const usagePercent = (requestedStock / baremTotal) * 100;
    barWidth = Math.min(usagePercent, 100);
    
    // Kalan stok hesapla
    const kalanStok = baremTotal - requestedStock;
    barLabel = `Kalan ${kalanStok}`;
    
    if (isPurchaseRequest) {
      barColor = '#8b5cf6'; // Mor
    } else {
      barColor = usagePercent >= 100 ? '#ef4444' : '#f97316'; // Dolunca kırmızı, değilse turuncu
    }
  } else if (isPurchaseRequest) {
    // PurchaseRequest barem olmadan: sadece aranan miktarı göster
    barWidth = 100;
    barColor = '#8b5cf6';
    barLabel = `${medication.currentStock} Adet Aranıyor`;
  } else {
    // Normal: kalan stok oranı
    barWidth = Math.min((remainingStock / totalStock) * 100, 100);
    barColor = '#10b981'; // Yeşil
  }
  const hasMF = mfData.bonus > 0;
  
  // Birim başına kar hesapla: 1+0'a göre ne kadar tasarruf
  // Örnek: 20+2 barem, fiyat 25 TL
  // 1+0'da: 22 adet için 22 x 25 = 550 TL ödersin
  // 20+2'de: 22 adet için 20 x 25 = 500 TL ödersin  
  // Birim başına kar = (bonus / (min + bonus)) * fiyat
  const totalUnits = mfData.min + mfData.bonus;
  const perUnitProfit = hasMF && totalUnits > 0 
    ? (mfData.bonus / totalUnits) * medication.price 
    : 0;

  return (
    <div className={`${styles.cardWrapper} ${isOutOfStock ? styles.outOfStock : ''}`}>
      <Link href={href} className={styles.productLink}>
        <div className={styles.imageContainer}>
          {isOutOfStock && <div className={styles.outOfStockBanner}><span>TÜKENDİ</span></div>}
          {/* 🆕 Offer Type Badge - top-left corner */}
          {offerType && offerTypeBadgeConfig[offerType.toLowerCase()] && (
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              backgroundColor: offerTypeBadgeConfig[offerType.toLowerCase()].bg,
              color: offerTypeBadgeConfig[offerType.toLowerCase()].text,
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: '600',
              zIndex: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              {offerTypeBadgeConfig[offerType.toLowerCase()].label}
            </div>
          )}
          {/* Barem Badge - resmin üstünde sağ köşede */}
          {hasMF && (
            <div className={styles.baremBadge}>
              <span className={styles.baremMin}>{mfData.min}</span>
              <span className={styles.baremPlus}>+</span>
              <span className={styles.baremBonus}>{mfData.bonus}</span>
            </div>
          )}
          <img src={medication.imageUrl || "/dolorex_placeholder.png"} alt={medication.name} className={styles.productImage} />
        </div>
      </Link>

      <div className={styles.cardContent}>
        <h3 className={styles.productName} title={medication.name}>{medication.name}</h3>
        
        <div className={styles.pharmacyList}>
          {medication.sellers.length > 0 ? (
            <>
              {medication.sellers.map((seller, index) => (
                <React.Fragment key={`${seller.pharmacyId}-${index}`}>
                  <Link 
                    href={`/profile/${seller.pharmacyId}`} 
                    className={styles.pharmacyLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {seller.pharmacyName}
                  </Link>
                </React.Fragment>
              ))}
              {extraSellerCount > 0 && (
                <Link href={href} className={styles.extraSellersLink}>
                  {' '}ve {extraSellerCount} eczane daha
                </Link>
              )}
            </>
          ) : (
            <span className={styles.noSeller}>Satan eczane bulunmuyor</span>
          )}
        </div>

        {/* Stok Barı - Joint Order için barem bazlı, diğerleri için normal */}
        <div className={styles.stockSection}>
          <div className={styles.stockBar}>
            <div 
              className={styles.stockFill} 
              style={{ width: `${barWidth}%`, backgroundColor: barColor }}
            ></div>
            <span className={styles.stockText}>
              {barLabel 
                ? barLabel 
                : isPurchaseRequest 
                  ? `🔍 ${medication.currentStock} Aranan Adet` 
                  : isJointOrder 
                    ? `${medication.currentStock} Adet Talep` 
                    : `${remainingStock} Adet`}
            </span>
          </div>
        </div>

        <div className={styles.priceRow}>
          <div className={styles.price}>
            <PriceDisplay amount={medication.price} />
          </div>
          {/* Birim başına kar göster: 1+0'a göre tasarruf */}
          {perUnitProfit > 0 && (
            <div style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              marginLeft: '8px'
            }}>
              <span>+</span>
              <span>{perUnitProfit.toFixed(2)} ₺</span>
            </div>
          )}
        </div>
        
        <Link href={href} className={styles.productLink}>
            <button className={styles.addToCartBtn} disabled={isOutOfStock}>
            {isOutOfStock ? 'Stokta Yok' : 'İncele'}
            </button>
        </Link>
      </div>
    </div>
  );
};

export default React.memo(ProductCard);