// src/components/ilaclar/ProductCard.tsx
import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { PharmacyLink, PriceDisplay } from '@/components/common';
import type { ShowroomMedication } from '../../lib/dashboardData';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  medication: ShowroomMedication & { malFazlasi?: string };
  linkHref?: string; // Özel link URL'i (barem parametresi için)
  extraSellerCount?: number; // 2'den fazla eczane varsa kalan sayı
  offerType?: string; // 🆕 Teklif türü: stocksale, jointorder, purchaserequest
  buyers?: { pharmacyId: number; pharmacyName: string; quantity: number; orderDate?: string }[]; // 🆕 Sipariş verenler
}

// 🆕 Offer type badge color mapping
const offerTypeBadgeConfig: Record<string, { bg: string; text: string; label: string }> = {
  stocksale: { bg: '#10b981', text: 'white', label: 'Stok Satışı' },
  jointorder: { bg: '#f97316', text: 'white', label: 'Ortak Sipariş' },
  purchaserequest: { bg: '#8b5cf6', text: 'white', label: 'Alım Talebi' } // 🆕 Mor renk
};

const ProductCard: React.FC<ProductCardProps> = ({ medication, linkHref, extraSellerCount = 0, offerType, buyers }) => {
  // Link URL - özel veya varsayılan
  const href = linkHref || `/ilaclar/${medication.id}`;

  // MalFazlası parsing - "20+2" formatından bonus'u al
  const parseMF = (mf: string | undefined): { min: number; bonus: number } => {
    if (!mf || mf === '0+0') return { min: 0, bonus: 0 };
    const parts = mf.split('+').map(s => parseInt(s.trim()) || 0);
    return { min: parts[0] || 0, bonus: parts[1] || 0 };
  };
  
  const mfData = parseMF(medication.malFazlasi);
  const isJointOrder = offerType?.toLowerCase() === 'jointorder';
  const isPurchaseRequest = offerType?.toLowerCase() === 'purchaserequest'; // 🆕

  // Kalan stok hesapla
  const soldQty = medication.soldQuantity ?? 0;
  const remainingStock = medication.remainingStock ?? (medication.currentStock - soldQty); // Standard calculation
  
  // Determine if Out of Stock
  let isOutOfStock = remainingStock <= 0;

  // For Joint Order / Purchase Request
  if (isJointOrder || isPurchaseRequest) {
      const singleBaremTotal = mfData.min + mfData.bonus;
      
      // Only apply Barem logic if we have a REAL barem (> 1). 
      // '1+0' is the default for missing data, and causes false 'Tükendi' (0 remaining).
      if (mfData.min > 0 && singleBaremTotal > 1) {
          // Correct Barem Logic when Barem is known and valid
          const requestedStock = medication.currentStock || 0;
          // Calculate orderedStock from buyers array directly (more reliable than soldQuantity)
          const orderedStock = (buyers && buyers.length > 0) 
              ? buyers.reduce((sum, b) => sum + b.quantity, 0) 
              : 0;
          const totalUsedStock = requestedStock + orderedStock;
          
          const baremMultiple = Math.max(1, Math.ceil(totalUsedStock / singleBaremTotal));
          const effectiveBaremTotal = singleBaremTotal * baremMultiple;
          const jointRemaining = Math.max(0, effectiveBaremTotal - totalUsedStock);
          
          isOutOfStock = jointRemaining === 0;
      } else {
          // Fallback: If no Barem info available (or default 1+0), assume available (never Tükendi)
          isOutOfStock = false;
      }
  }
  
  // Stok doluluk oranı hesapla
  const totalStock = medication.currentStock || 1;
  let barWidth: number;
  let barColor: string;
  let barLabel: string = '';
  
  if ((isJointOrder || isPurchaseRequest) && mfData.min > 0 && (mfData.min > 1 || mfData.bonus > 0)) {
    // 🆕 JointOrder/PurchaseRequest: barem doluluk oranı  
    // Talep = currentStock, Siparişler = soldQuantity
    const singleBaremTotal = mfData.min + mfData.bonus;
    const requestedStock = medication.currentStock; // Bu teklifin talep ettiği stok
    // Calculate orderedStock from buyers array directly (more reliable than soldQuantity)
    const orderedStock = (buyers && buyers.length > 0) 
        ? buyers.reduce((sum, b) => sum + b.quantity, 0) 
        : 0;
    const totalUsedStock = requestedStock + orderedStock;
    
    // 🆕 Barem katını hesapla: toplam kullanım / tek barem = kaç kat
    const baremMultiple = Math.ceil(totalUsedStock / singleBaremTotal);
    const effectiveBaremTotal = singleBaremTotal * Math.max(1, baremMultiple);
    
    const usagePercent = (totalUsedStock / effectiveBaremTotal) * 100;
    barWidth = Math.min(usagePercent, 100);
    
    // 🆕 Kalan stok: efektif barem toplamı - talep - siparişler
    const kalanStok = Math.max(0, effectiveBaremTotal - totalUsedStock);
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

  // 🆕 Multi-image hover state
  const [hoverImageIndex, setHoverImageIndex] = useState(0);
  
  // 🆕 Use imageCount from API (comes from backend, default to 1)
  // TEMPORARILY DISABLED: Until AllImagePaths API is implemented, 
  // only show 1 image to prevent 404 errors from different extensions
  // TODO: Re-enable when API returns imageUrls array with correct paths
  const validImageCount = 1; // Math.min(medication.imageCount ?? 1, 4);
  
  // 🆕 Generate possible image paths from first image (limited by validImageCount)
  const imagePaths = useMemo(() => {
    const imageUrl = medication.imageUrl;
    if (!imageUrl) return [];
    
    // Only return the first image URL
    const cleanPath = imageUrl.replace(/^\//, '');
    return [cleanPath];
  }, [medication.imageUrl]);
  
  // 🆕 Handle mouse move for hover zones - use imagePaths.length for actual available images
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const actualCount = imagePaths.length;
    if (actualCount <= 1) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const zoneWidth = width / actualCount;
    const index = Math.min(Math.floor(x / zoneWidth), actualCount - 1);
    
    setHoverImageIndex(index);
  }, [imagePaths.length]);
  
  const handleMouseLeave = useCallback(() => {
    setHoverImageIndex(0);
  }, []);
  
  // 🆕 Get current image URL with backend prefix
  const getCurrentImageUrl = () => {
    const baseUrl = '';
    
    // No images available
    if (imagePaths.length === 0) {
      return medication.imageUrl?.startsWith('/images/') 
        ? `${baseUrl}${medication.imageUrl}` 
        : '/logoYesil.png';
    }
    
    // Clamp index to available paths
    const safeIndex = Math.min(hoverImageIndex, imagePaths.length - 1);
    return `${baseUrl}/${imagePaths[safeIndex]}`;
  };

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
          {/* 🆕 Hover zone image container */}
          <div 
            className={styles.hoverImageZone}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <img 
              src={getCurrentImageUrl()}
              alt={medication.name} 
              className={styles.productImage}
              onError={(e) => {
                // Only show fallback if first image fails
                if (hoverImageIndex === 0) {
                  e.currentTarget.src = '/logoYesil.png';
                } else {
                  // Go back to first image
                  setHoverImageIndex(0);
                }
              }}
            />
            {/* 🆕 Hover indicator dots - only show for multiple images */}
            {imagePaths.length > 1 && (
              <div className={styles.imageIndicators}>
                {imagePaths.map((_, index) => (
                  <div 
                    key={index} 
                    className={`${styles.indicator} ${hoverImageIndex === index ? styles.indicatorActive : ''}`}
                  />
                ))}
              </div>
            )}
          </div>
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