// src/components/cart/CartItem.tsx
// ### OPTİMİZASYON: React.memo ve useCallback import edildi ###
import React, { useCallback } from 'react';
import { CartItem } from '../../context/CartContext';
import styles from './CartItem.module.css';

interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (productId: number, sellerName: string, newQuantity: number) => void;
  onRemove: (productId: number, sellerName: string) => void;
}

// ### OPTİMİZASYON: React.memo ###
// Bileşen, 'item' prop'u veya fonksiyonlar değişmediği sürece
// gereksiz yere yeniden render olmasını engeller.
const CartItemComponent: React.FC<CartItemProps> = React.memo(({ item, onUpdateQuantity, onRemove }) => {
  const { product, quantity, sellerName } = item;
  
  // ### OPTİMİZASYON: useCallback ###
  // Fonksiyonların her render'da yeniden oluşturulmasını engeller.
  const handleDecrement = useCallback(() => {
    onUpdateQuantity(product.id, sellerName, quantity - 1);
  }, [onUpdateQuantity, product.id, sellerName, quantity]);

  // ### OPTİMİZASYON: useCallback ###
  const handleIncrement = useCallback(() => {
    // Stok kontrolü 'updateQuantity' fonksiyonunun içinde (context'te) yapılıyor.
    onUpdateQuantity(product.id, sellerName, quantity + 1);
  }, [onUpdateQuantity, product.id, sellerName, quantity]);

  // ### OPTİMİZASYON: useCallback ###
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
        <span className={styles.itemPrice}>{product.price.toFixed(2).replace('.', ',')} ₺</span>
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

CartItemComponent.displayName = 'CartItemComponent'; // React.memo için

export default CartItemComponent;