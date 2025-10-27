// src/components/cart/CartPanel.tsx
import React from 'react';
import { useCart } from '../../context/CartContext';
import SlidePanel from '../ui/SlidePanel';
import CartItemComponent from './CartItem';
import styles from './CartPanel.module.css';

interface CartPanelProps {
  show: boolean;
  onClose: () => void;
}

const CartPanel: React.FC<CartPanelProps> = ({ show, onClose }) => {
  // GÜNCELLENDİ: clearCart'ı buradan alıyoruz ama onMarkAllRead için kullanmayacağız
  const { cartItems, clearCart, updateQuantity, removeFromCart } = useCart();

  const total = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  // handleMarkAllRead fonksiyonu artık kullanılmayacak, kaldırılabilir veya yorum satırı yapılabilir
  /*
  const handleMarkAllRead = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (window.confirm("Sepeti boşaltmak istediğinizden emin misiniz?")) {
          clearCart();
      }
  };
  */

  return (
    <SlidePanel
      title="Sepetim"
      show={show}
      onClose={onClose}
      // GÜNCELLENDİ: onMarkAllRead prop'u kaldırıldı
      // onMarkAllRead={handleMarkAllRead}
    >
      {cartItems.length > 0 ? (
        <div className={styles.cartPanelContainer}>
          <div className={styles.cartList}>
            {cartItems.map((item) => ( // index'e gerek kalmadı
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
            {/* Sepeti Boşalt butonu eklenebilir */}
            <button onClick={() => { if (window.confirm("Sepeti boşaltmak istediğinizden emin misiniz?")) { clearCart(); } }} className={styles.clearCartButton}>Sepeti Boşalt</button>
            <button className={styles.checkoutButton}>
              Siparişi Tamamla
            </button>
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