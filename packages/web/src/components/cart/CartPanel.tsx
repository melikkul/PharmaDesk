// src/components/cart/CartPanel.tsx
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '../../store/CartContext';
import { useSignalR } from '../../store/SignalRContext';
import SlidePanel from '../ui/SlidePanel';
import { PriceDisplay } from '@/components/common';
import CartItemComponent from './CartItem';
import styles from './CartPanel.module.css';

interface CartPanelProps {
  show: boolean;
  onClose: () => void;
}

// 🆕 Lock status per offer
interface LockStatusMap {
  [offerId: number]: number; // othersLocked quantity
}

const CartPanel: React.FC<CartPanelProps> = ({ show, onClose }) => {
  const { cartItems, clearCart, updateQuantity, removeFromCart, pendingUpdates, setDepotFulfillment } = useCart();
  const { connection } = useSignalR();
  
  // 🆕 Lock status for cart items
  const [lockStatus, setLockStatus] = useState<LockStatusMap>({});
  
  // 🆕 Fetch lock status for all cart items
  const fetchAllLockStatus = useCallback(async () => {
    if (cartItems.length === 0) return;
    
    const API_BASE_URL = '';
    const newLockStatus: LockStatusMap = {};
    
    for (const item of cartItems) {
      if (!item.offerId) continue;
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/stocklocks/offer/${item.offerId}`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          // 🆕 othersLocked = başka kullanıcıların kilitlediği miktar
          newLockStatus[item.offerId] = data.othersLocked || 0;
        }
      } catch (err) {
        console.error('[CartPanel] Lock status fetch error:', err);
      }
    }
    
    setLockStatus(newLockStatus);
  }, [cartItems]);
  
  // Debounce ref for lock status updates
  const lockStatusDebounceRef = React.useRef<NodeJS.Timeout | null>(null);
  
  // Fetch on mount and when cart items change
  useEffect(() => {
    if (show) {
      fetchAllLockStatus();
    }
  }, [show, fetchAllLockStatus]);
  
  // 🆕 Listen for stock lock updates via SignalR with debounce
  useEffect(() => {
    if (!connection) return;
    
    const handleStockLockUpdate = () => {
      console.log('[CartPanel] Stock lock update received, debouncing...');
      
      // Clear previous debounce timer
      if (lockStatusDebounceRef.current) {
        clearTimeout(lockStatusDebounceRef.current);
      }
      
      // Debounce: 1 saniye bekle, sonra fetch et
      lockStatusDebounceRef.current = setTimeout(() => {
        console.log('[CartPanel] Debounce complete, fetching lock status...');
        fetchAllLockStatus();
      }, 1000);
    };
    
    connection.on('ReceiveStockLockUpdate', handleStockLockUpdate);
    return () => {
      connection.off('ReceiveStockLockUpdate', handleStockLockUpdate);
      if (lockStatusDebounceRef.current) {
        clearTimeout(lockStatusDebounceRef.current);
      }
    };
  }, [connection, fetchAllLockStatus]);

  const total = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cartItems]);

  const handleClearCart = useCallback(async () => {
    console.log('[CartPanel] handleClearCart called');
    // Temporarily disabled for testing
    // if (window.confirm("Sepeti boşaltmak istediğinizden emin misiniz?")) {
    console.log('[CartPanel] Calling clearCart...');
    try {
      await clearCart();
      console.log('[CartPanel] clearCart completed');
    } catch (err) {
      console.error('[CartPanel] clearCart error:', err);
    }
    // }
  }, [clearCart]);
  
  // 🆕 Calculate total locked quantity affecting cart items
  const totalOthersLocked = useMemo(() => {
    return Object.values(lockStatus).reduce((sum, locked) => sum + locked, 0);
  }, [lockStatus]);

  return (
    <SlidePanel
      title="Sepetim"
      show={show}
      onClose={onClose}
      // GÜNCELLENDİ: onMarkAllRead prop'u kaldırıldı
    >
      {cartItems.length > 0 ? (
        <div className={styles.cartPanelContainer}>
          {/* 🆕 Global lock warning */}
          {totalOthersLocked > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              backgroundColor: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              marginBottom: '12px',
              fontSize: '13px',
              color: '#b45309',
              fontWeight: '500',
            }}>
              <span>⚠️</span>
              <span>Sepetinizdeki bazı ürünler işlemde - stok sınırlı olabilir</span>
            </div>
          )}
          
          <div className={styles.cartList}>
            {cartItems.map((item) => (
              <div key={`${item.product.id}-${item.sellerName}`}>
                <CartItemComponent
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeFromCart}
                  isPending={pendingUpdates && pendingUpdates.has(`${item.product.id}-${item.sellerName}`)}
                  othersLockedQuantity={item.offerId ? (lockStatus[item.offerId] || 0) : 0}
                />
                {/* 🆕 Depot Fulfillment Checkbox - Only for PurchaseRequest */}
                {item.offerType === 'purchaserequest' && (
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    backgroundColor: item.isDepotSelfOrder ? '#ddd6fe' : '#ede9fe',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#5b21b6',
                    border: item.isDepotSelfOrder ? '2px solid #8b5cf6' : '2px solid transparent',
                    marginTop: '4px',
                    marginBottom: '8px',
                    marginLeft: '60px',
                    transition: 'all 0.2s ease'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={item.isDepotSelfOrder || false}
                      onChange={(e) => setDepotFulfillment(item.id, e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#8b5cf6' }}
                    />
                    📦 Depodan ben söyleyeceğim
                  </label>
                )}
                {/* 🆕 Per-item lock warning */}
                {item.offerId && lockStatus[item.offerId] > 0 && (
                  <div style={{
                    fontSize: '11px',
                    color: '#b45309',
                    backgroundColor: '#fef3c7',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    marginTop: '-8px',
                    marginBottom: '8px',
                    marginLeft: '60px',
                  }}>
                    ⚠️ {lockStatus[item.offerId]} adet işlemde
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className={styles.cartFooter}>
            <div className={styles.totalPrice}>
              <span>Toplam Tutar:</span>
              <strong><PriceDisplay amount={total} /></strong>
            </div>
            <button type="button" onClick={handleClearCart} className={styles.clearCartButton}>Sepeti Boşalt</button>
            
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