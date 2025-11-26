// src/components/cart/CartItem.tsx
import React, { useCallback } from 'react';
import { CartItem } from '../../store/CartContext';
import { PriceDisplay } from '@/components/common';
import styles from './CartItem.module.css';

interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (productId: number, sellerName: string, newQuantity: number) => void;
  onRemove: (productId: number, sellerName: string) => void;
}

const CartItemComponent: React.FC<CartItemProps> = React.memo(({ item, onUpdateQuantity, onRemove }) => {
  const { product, quantity, sellerName } = item;
  
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

  return (
    <div className={styles.cartItem}>
      <img src={product.imageUrl || '/dolorex_placeholder.png'} alt={product.name} className={styles.itemImage} />
      <div className={styles.itemDetails}>
        <strong className={styles.itemName}>{product.name}</strong>
        <span className={styles.itemSeller}>Satıcı: {sellerName}</span>
        <span className={styles.itemPrice}>
          <PriceDisplay amount={product.price} />
        </span>
      </div>
      <div className={styles.itemActions}>
        <div className={styles.quantitySelector}>
          <button onClick={handleDecrement} disabled={quantity <= 1}>-</button>
          <input type="number" value={quantity} readOnly />
          <button onClick={handleIncrement} disabled={quantity >= product.currentStock}>+</button>
        </div>
        <button onClick={handleRemove} className={styles.removeButton}>
          Kaldır
        </button>
      </div>
    </div>
  );
});

CartItemComponent.displayName = 'CartItemComponent';

export default CartItemComponent;