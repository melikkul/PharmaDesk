// src/components/cart/CartItem.tsx
import React, { useCallback } from 'react';
import { CartItem } from '../../store/CartContext';
import { PriceDisplay } from '@/components/common';
import styles from './CartItem.module.css';

interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (productId: number, sellerName: string, newQuantity: number) => void;
  onRemove: (productId: number, sellerName: string) => void;
  isPending?: boolean; // Miktar güncelleme beklemede mi?
}

const CartItemComponent: React.FC<CartItemProps> = React.memo(({ item, onUpdateQuantity, onRemove, isPending = false }) => {
  const { product, quantity, sellerName, offerType, isDepotSelfOrder } = item;
  
  const handleDecrement = useCallback(() => {
    onUpdateQuantity(product.id, sellerName, quantity - 1);
  }, [onUpdateQuantity, product.id, sellerName, quantity]);

  const handleIncrement = useCallback(() => {
    onUpdateQuantity(product.id, sellerName, quantity + 1);
  }, [onUpdateQuantity, product.id, sellerName, quantity]);

  const handleRemove = useCallback(() => {
    if (window.confirm(`${product.name} ürününü sepetten kaldırmak istediğinizden emin misiniz?`)) {
      onRemove(product.id, sellerName);
    }
  }, [onRemove, product.id, product.name, sellerName]);

  // Teklif türü badge renkleri
  const getOfferTypeBadge = () => {
    if (!offerType) return null;
    
    const config = {
      jointorder: { bg: '#f97316', label: 'Ortak Sipariş' },
      purchaserequest: { bg: '#8b5cf6', label: 'Alım Talebi' },
      stocksale: { bg: '#10b981', label: 'Stok Satışı' }
    };
    
    const typeConfig = config[offerType] || config.stocksale;
    
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
      <img src={product.imageUrl || '/dolorex_placeholder.png'} alt={product.name} className={styles.itemImage} />
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
          <button onClick={handleDecrement} disabled={quantity <= 1}>-</button>
          <input 
            type="number" 
            value={quantity} 
            readOnly 
            style={{
              fontWeight: isPending ? '700' : '500',
              color: isPending ? '#3b82f6' : 'inherit'
            }}
          />
          <button onClick={handleIncrement} disabled={quantity >= product.currentStock}>+</button>
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
        <button onClick={handleRemove} className={styles.removeButton}>
          Kaldır
        </button>
      </div>
    </div>
  );
});

CartItemComponent.displayName = 'CartItemComponent';

export default CartItemComponent;