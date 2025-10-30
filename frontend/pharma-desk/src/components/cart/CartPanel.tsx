// src/components/cart/CartPanel.tsx
// ### OPTİMİZASYON: useMemo ve useCallback import edildi ###
import React, { useMemo, useCallback } from 'react';
import Link from 'next/link'; // YENİ: Link import edildi
import { useCart } from '../../context/CartContext';
import SlidePanel from '../ui/SlidePanel';
import CartItemComponent from './CartItem';
import styles from './CartPanel.module.css';

interface CartPanelProps {
  show: boolean;
  onClose: () => void;
}

const CartPanel: React.FC<CartPanelProps> = ({ show, onClose }) => {
  // GÜNCELLENDİ: clearCart'ı buradan alıyoruz
  const { cartItems, clearCart, updateQuantity, removeFromCart } = useCart();

  // ### OPTİMİZASYON: useMemo ###
  // Toplam fiyat, 'cartItems' değişmediği sürece yeniden hesaplanmaz.
  const total = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cartItems]);

  // ### OPTİMİZASYON: useCallback ###
  // Sepeti boşaltma fonksiyonu memoize edildi.
  const handleClearCart = useCallback(() => {
    if (window.confirm("Sepeti boşaltmak istediğinizden emin misiniz?")) {
        clearCart();
    }
  }, [clearCart]); // 'clearCart' context'ten geldiği ve memoize edildiği için stabil.

  return (
    <SlidePanel
      title="Sepetim"
      show={show}
      onClose={onClose}
      // GÜNCELLENDİ: onMarkAllRead prop'u kaldırıldı
    >
      {cartItems.length > 0 ? (
        <div className={styles.cartPanelContainer}>
          <div className={styles.cartList}>
            {cartItems.map((item) => (
              <CartItemComponent
                key={`${item.product.id}-${item.sellerName}`}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
              />
            ))}
          </div>
          <div className={styles.cartFooter}>
            <div className={styles.totalPrice}>
              <span>Toplam Tutar:</span>
              <strong>{total.toFixed(2).replace('.', ',')} ₺</strong>
            </div>
            {/* Sepeti Boşalt butonu eklendi */}
            <button onClick={handleClearCart} className={styles.clearCartButton}>Sepeti Boşalt</button>
            
            {/* YENİ: Buton Link'e dönüştürüldü (ISTEK 4) */}
            <Link href="/sepet" className={styles.checkoutButton} onClick={onClose}>
              Siparişi Tamamla
            </Link>
          </div>
        </div>
      ) : (
        <div className="panel-empty-state">
          <p>Sepetiniz şu an boş.</p>
        </div>
      )}
    </SlidePanel>
  );
};

export default CartPanel;