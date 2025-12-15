// src/components/cart/CartItem.tsx
import React, { useCallback, useMemo } from 'react';
import { CartItem } from '../../store/CartContext';
import { PriceDisplay } from '@/components/common';
import styles from './CartItem.module.css';

interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (productId: number, sellerName: string, newQuantity: number) => void;
  onRemove: (productId: number, sellerName: string) => void;
  isPending?: boolean; // Miktar güncelleme beklemede mi?
  othersLockedQuantity?: number; // 🆕 Başkaları tarafından kilitlenen stok
}

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

const CartItemComponent: React.FC<CartItemProps> = React.memo(({ item, onUpdateQuantity, onRemove, isPending = false, othersLockedQuantity = 0 }) => {
  const { product, quantity, sellerName, offerType, isDepotSelfOrder } = item;
  
  // 🆕 Memoize parsed image URL
  const imageUrl = useMemo(() => getImageUrl(product.imageUrl), [product.imageUrl]);
  
  // 🆕 Max stok kontrolü için sabit
  const MAX_ALLOWED = 1000;
  
  // 🆕 Miktar limiti hesaplaması - Component scope'unda olmalı (JSX erişimi için)
  const currentStock = Number(product.currentStock || 0);
  const lockedQty = Number(othersLockedQuantity || 0);
  // Kullanıcı isteği üzerine -1 güvenlik payı eklendi (Limit aşımını önlemek için)
  const availableStock = Math.max(0, currentStock - lockedQty - 1);
  const effectiveMax = Math.min(availableStock, MAX_ALLOWED);

  const handleIncrement = useCallback(() => {
    if (isPending) return; // 🆕 Race condition koruması
    
    console.log(`[CartItem] Check limit: qty=${quantity}, max=${effectiveMax}`);

    if (quantity < effectiveMax) {
      onUpdateQuantity(product.id, sellerName, quantity + 1);
    }
  }, [quantity, product.id, sellerName, onUpdateQuantity, effectiveMax, isPending]);

  const handleDecrement = useCallback(() => {
    if (isPending) return; // 🆕 Race condition koruması
    if (quantity > 1) {
      onUpdateQuantity(product.id, sellerName, quantity - 1);
    }
  }, [quantity, product.id, sellerName, onUpdateQuantity, isPending]);

  const handleRemove = useCallback(async () => {
    // console.log('[CartItem] handleRemove called for:', product.name);
    // Temporarily disabled confirm to test
    // if (window.confirm(`${product.name} ürününü sepetten kaldırmak istediğinizden emin misiniz?`)) {
    // console.log('[CartItem] Calling onRemove...');
    try {
      const result = await onRemove(product.id, sellerName);
      console.log('[CartItem] onRemove result:', result);
    } catch (err) {
      console.error('[CartItem] onRemove error:', err);
    }
    // }
  }, [onRemove, product.id, product.name, sellerName]);

  // Teklif türü badge renkleri
  const getOfferTypeBadge = () => {
    if (!offerType) return null;
    
    const config: Record<string, { bg: string; label: string }> = {
      jointorder: { bg: '#f97316', label: 'Ortak Sipariş' },
      purchaserequest: { bg: '#8b5cf6', label: 'Alım Talebi' },
      stocksale: { bg: '#10b981', label: 'Stok Satışı' }
    };
    
    // Normalize to lowercase for case-insensitive matching
    const normalizedType = offerType.toLowerCase();
    const typeConfig = config[normalizedType] || config.stocksale;
    
    return (
      <span style={{
        display: 'inline-block',
        marginTop: '6px',
        marginBottom: '4px',
        padding: '3px 8px',
        borderRadius: '10px',
        fontSize: '10px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        backgroundColor: typeConfig.bg,
        color: 'white'
      }}>
        {typeConfig.label}
      </span>
    );
  };

  return (
    <div 
      className={styles.cartItem} 
      style={{ 
        opacity: isPending ? 0.7 : 1,
        transition: 'opacity 0.2s ease'
      }}
    >
      {/* 🆕 Enhanced image with fallback handler */}
      <img 
        src={imageUrl} 
        alt={product.name} 
        className={styles.itemImage}
        onError={(e) => { e.currentTarget.src = '/placeholder-med.png'; }}
      />
      <div className={styles.itemDetails}>
        <strong className={styles.itemName}>{product.name}</strong>
        {getOfferTypeBadge()}
        <span className={styles.itemSeller}>Satıcı: {sellerName}</span>
        <span className={styles.itemPrice}>
          <PriceDisplay amount={product.price} />
        </span>
        {/* Depodan ben söyleyeceğim uyarısı */}
        {isDepotSelfOrder && (
          <div style={{
            marginTop: '6px',
            padding: '3px 8px',
            backgroundColor: '#fef3c7',
            color: '#b45309',
            borderRadius: '6px',
            fontSize: '10px',
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
      <div className={styles.itemActions}>
        <div className={styles.quantitySelector}>
          <button onClick={handleDecrement} disabled={quantity <= 1 || isPending}>-</button>
          <input 
            type="number" 
            value={quantity} 
            readOnly 
            style={{
              fontWeight: isPending ? '700' : '500',
              color: isPending ? '#3b82f6' : 'inherit'
            }}
          />
          <button 
            onClick={handleIncrement} 
            disabled={quantity >= effectiveMax || isPending}
            style={{ 
              opacity: (quantity >= effectiveMax || isPending) ? 0.5 : 1,
              cursor: (quantity >= effectiveMax || isPending) ? 'not-allowed' : 'pointer'
            }}
          >+</button>
        </div>
        {/* Senkronizasyon göstergesi */}
        {isPending && (
          <span style={{
            fontSize: '11px',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '4px'
          }}>
            <span style={{ 
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              animation: 'pulse 1s infinite'
            }} />
            Kaydediliyor...
          </span>
        )}
        <button type="button" onClick={handleRemove} className={styles.removeButton}>
          Kaldır
        </button>
      </div>
    </div>
  );
});

CartItemComponent.displayName = 'CartItemComponent';

export default CartItemComponent;