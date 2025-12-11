// src/components/cart/CartPanel.tsx
import React, { useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useCart } from '../../store/CartContext';
import SlidePanel from '../ui/SlidePanel';
import { PriceDisplay } from '@/components/common';
import CartItemComponent from './CartItem';
import styles from './CartPanel.module.css';

interface CartPanelProps {
  show: boolean;
  onClose: () => void;
}

const CartPanel: React.FC<CartPanelProps> = ({ show, onClose }) => {
  const { cartItems, clearCart, updateQuantity, removeFromCart, pendingUpdates } = useCart();

  const total = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cartItems]);

  const handleClearCart = useCallback(() => {
    if (window.confirm("Sepeti boşaltmak istediğinizden emin misiniz?")) {
        clearCart();
    }
  }, [clearCart]);

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
                isPending={pendingUpdates && pendingUpdates.has(`${item.product.id}-${item.sellerName}`)}
              />
            ))}
          </div>
          <div className={styles.cartFooter}>
            <div className={styles.totalPrice}>
              <span>Toplam Tutar:</span>
              <strong><PriceDisplay amount={total} /></strong>
            </div>
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