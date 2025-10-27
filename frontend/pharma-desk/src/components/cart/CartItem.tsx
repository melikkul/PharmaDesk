// src/components/cart/CartItem.tsx
import React, { useState } from 'react';
import { CartItem } from '../../context/CartContext';
import styles from './CartItem.module.css';

interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (productId: number, sellerName: string, newQuantity: number) => void;
  onRemove: (productId: number, sellerName: string) => void;
}

const CartItemComponent: React.FC<CartItemProps> = ({ item, onUpdateQuantity, onRemove }) => {
  const { product, quantity, sellerName } = item;
  
  // Basit bir miktar artırma/azaltma
  const handleDecrement = () => {
    onUpdateQuantity(product.id, sellerName, quantity - 1);
  };

  const handleIncrement = () => {
    // Burada stok kontrolü de yapılabilir, basitlik için eklenmedi
    onUpdateQuantity(product.id, sellerName, quantity + 1);
  };

  const handleRemove = () => {
    if (window.confirm(`${product.name} ürününü sepetten kaldırmak istediğinizden emin misiniz?`)) {
      onRemove(product.id, sellerName);
    }
  };

  return (
    <div className={styles.cartItem}>
      <img src={product.imageUrl || '/dolorex_placeholder.png'} alt={product.name} className={styles.itemImage} />
      <div className={styles.itemDetails}>
        <strong className={styles.itemName}>{product.name}</strong>
        <span className={styles.itemSeller}>Satıcı: {sellerName}</span>
        <span className={styles.itemPrice}>{product.price.toFixed(2).replace('.', ',')} ₺</span>
      </div>
      <div className={styles.itemActions}>
        <div className={styles.quantitySelector}>
          <button onClick={handleDecrement}>-</button>
          <input type="number" value={quantity} readOnly />
          <button onClick={handleIncrement}>+</button>
        </div>
        <button onClick={handleRemove} className={styles.removeButton}>
          Kaldır
        </button>
      </div>
    </div>
  );
};

export default CartItemComponent;