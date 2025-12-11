// src/store/CartContext.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSignalR } from './SignalRContext';
import { cartService, BackendCart, BackendCartItem } from '../services/cartService';
import { ShowroomMedication } from '../lib/dashboardData';

// Sepet için gereken minimum ürün bilgileri
export interface CartProduct {
  id: number;
  name: string;
  imageUrl: string;
  manufacturer: string;
  price: number;
  currentStock: number;
  offerId?: number;
  sellerName?: string;
  sellerUsername?: string;
  sellerId?: number;
  offerType?: string;
}

// Frontend için uyarlanmış sepet öğesi
export interface CartItem {
  id: number; // Backend CartItem ID
  product: CartProduct;
  quantity: number;
  sellerName: string;
  isDepotSelfOrder?: boolean;
  offerType?: 'stocksale' | 'jointorder' | 'purchaserequest';
  offerId: number; // Backend Offer ID
  bonusQuantity?: number; // 🆕 Barem bonus miktarı
  profitAmount?: number; // 🆕 Tahmini kar
}

interface CartContextType {
  cartItems: CartItem[];
  loading: boolean;
  error: string | null;
  isUpdatingQuantity: boolean; // Miktar güncelleme işlemi devam ediyor mu?
  pendingUpdates: Set<string>; // Güncellenmekte olan item key'leri (productId-sellerName)
  addToCart: (product: ShowroomMedication | CartProduct, quantity: number, sellerName: string, isDepotSelfOrder?: boolean, offerType?: string) => Promise<boolean>;
  removeFromCart: (productId: number, sellerName: string) => Promise<boolean>;
  updateQuantity: (productId: number, sellerName: string, newQuantity: number) => void; // Artık debounced, Promise dönmez
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  unreadCartItemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const MAX_ALLOWED_QUANTITY = 1000;

// Backend response'unu frontend formatına dönüştür
function transformBackendCart(backendCart: BackendCart): CartItem[] {
  return backendCart.cartItems.map((item: BackendCartItem): CartItem => {
    // offer.type'ı güvenli bir şekilde string'e çevir
    const rawType = item.offer?.type;
    const typeStr = typeof rawType === 'string' ? rawType.toLowerCase() : 'stocksale';
    
    // 🆕 Kar hesapla: (bonus / toplam birim) * fiyat * miktar
    const stock = item.offer?.stock || 0;
    const bonus = item.offer?.bonusQuantity || 0;
    const price = item.offer?.price || 0;
    const totalUnits = stock + bonus;
    const profitAmount = totalUnits > 0 && bonus > 0 
      ? (bonus / totalUnits) * price * item.quantity 
      : 0;
    
    return {
      id: item.id,
      offerId: item.offerId,
      quantity: item.quantity,
      sellerName: item.offer?.pharmacyProfile?.pharmacyName || 'Bilinmeyen Satıcı',
      offerType: (typeStr as 'stocksale' | 'jointorder' | 'purchaserequest') || 'stocksale',
      bonusQuantity: bonus, // 🆕
      profitAmount: profitAmount, // 🆕
      product: {
        id: item.offer?.medication?.id || 0,
        name: item.offer?.medication?.name || '',
        imageUrl: item.offer?.medication?.imageUrl || '/dolorex_placeholder.png',
        manufacturer: item.offer?.medication?.manufacturer || '',
        price: item.offer?.price || 0,
        currentStock: item.offer?.stock || 0,
        offerId: item.offerId,
        sellerName: item.offer?.pharmacyProfile?.pharmacyName || '',
        sellerUsername: item.offer?.pharmacyProfile?.username || '',
        sellerId: item.offer?.pharmacyProfile?.id || 0,
        offerType: typeof rawType === 'string' ? rawType : 'StockSale',
      },
    };
  });
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const { connection, connectionState } = useSignalR();
  
  // Tekrarlayan fetch'leri önlemek için ref
  const isFetching = useRef(false);
  const lastFetchTime = useRef(0);
  const FETCH_COOLDOWN = 2000; // 2 saniye cooldown
  
  // AbortController ref - unmount olduğunda istekleri iptal etmek için
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Debounce için state ve ref'ler
  const [isUpdatingQuantity, setIsUpdatingQuantity] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingQuantities = useRef<Map<string, { cartItemId: number; quantity: number; originalQuantity: number }>>(new Map());
  const DEBOUNCE_DELAY = 500; // 500ms debounce

  // Sepeti backend'den yükle
  const fetchCart = useCallback(async (force = false) => {
    if (!token || isFetching.current) return;
    
    // Cooldown kontrolü (force ile bypass edilebilir)
    const now = Date.now();
    if (!force && now - lastFetchTime.current < FETCH_COOLDOWN) {
      return;
    }
    
    // Önceki isteği iptal et
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Yeni AbortController oluştur
    abortControllerRef.current = new AbortController();
    
    isFetching.current = true;
    lastFetchTime.current = now;
    setLoading(true);
    setError(null);

    try {
      const backendCart = await cartService.getCart(token, abortControllerRef.current.signal);
      const transformedItems = transformBackendCart(backendCart);
      setCartItems(transformedItems);
    } catch (err: unknown) {
      // AbortError ise sessizce geç (component unmount olmuş)
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[CartContext] Fetch aborted - component unmounted');
        return;
      }
      console.error("Sepet yüklenirken hata:", err);
      setError('Sepet yüklenirken hata oluştu');
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [token]);
  
  // Component unmount olduğunda AbortController'ı temizle
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);


  // Giriş yapıldığında sepeti yükle (auth loading tamamlandıktan sonra)
  useEffect(() => {
    // Auth hala yükleniyorsa bekle
    if (authLoading) return;
    
    if (isAuthenticated && token) {
      fetchCart();
    } else {
      // Çıkış yapıldığında veya giriş yapılmamışsa sepeti temizle
      setCartItems([]);
    }
  }, [isAuthenticated, token, authLoading, fetchCart]);

  // SignalR cart update listener
  useEffect(() => {
    if (connection && connectionState === 'Connected') {
      const handleCartUpdate = (data: { type: string; cartItemCount?: number }) => {
        console.log('[CartContext] SignalR cart update received:', data);
        // Sepeti yeniden yükle
        fetchCart();
      };

      connection.on('ReceiveCartUpdate', handleCartUpdate);

      return () => {
        connection.off('ReceiveCartUpdate', handleCartUpdate);
      };
    }
  }, [connection, connectionState, fetchCart]);

  // Sepete ürün ekle
  const addToCart = useCallback(async (
    product: ShowroomMedication | CartProduct, 
    quantity: number, 
    sellerName: string, 
    isDepotSelfOrder?: boolean, 
    offerType?: string
  ): Promise<boolean> => {
    if (!token) {
      setError('Giriş yapmanız gerekiyor');
      return false;
    }

    // offerId kontrolü - CartProduct veya ShowroomMedication'dan al
    const offerId = (product as CartProduct).offerId || (product as any).offerId;
    if (!offerId) {
      console.error('Product offerId is missing:', product);
      setError('Teklif ID bulunamadı');
      return false;
    }

    const effectiveMaxStock = Math.min(product.currentStock, MAX_ALLOWED_QUANTITY);
    const quantityToAdd = Math.max(1, Math.min(quantity, effectiveMaxStock));

    setLoading(true);
    setError(null);

    try {
      await cartService.addToCart(token, offerId, quantityToAdd);
      await fetchCart(); // Sepeti yeniden yükle
      return true;
    } catch (err: any) {
      console.error("Sepete eklenirken hata:", err);
      setError(err.message || 'Sepete eklenirken hata oluştu');
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, fetchCart]);

  // Sepetten ürün çıkar
  const removeFromCart = useCallback(async (productId: number, sellerName: string): Promise<boolean> => {
    if (!token) {
      setError('Giriş yapmanız gerekiyor');
      return false;
    }

    // cartItemId bul
    const cartItem = cartItems.find(
      item => item.product.id === productId && item.sellerName === sellerName
    );

    if (!cartItem) {
      console.warn('Cart item not found for removal');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      await cartService.removeFromCart(token, cartItem.id);
      // Optimistic update
      setCartItems(prev => prev.filter(item => item.id !== cartItem.id));
      return true;
    } catch (err) {
      console.error("Sepetten çıkarılırken hata:", err);
      setError('Ürün silinirken hata oluştu');
      await fetchCart(); // Hata durumunda yeniden yükle
      return false;
    } finally {
      setLoading(false);
    }
  }, [token, cartItems, fetchCart]);

  // Debounced API çağrısı yapan iç fonksiyon
  const executeQuantityUpdate = useCallback(async (itemKey: string) => {
    const pendingData = pendingQuantities.current.get(itemKey);
    if (!pendingData || !token) return;
    
    const { cartItemId, quantity, originalQuantity } = pendingData;
    
    console.log(`[Debounce] API call for ${itemKey}: quantity=${quantity}`);
    
    try {
      await cartService.updateQuantity(token, cartItemId, quantity);
      console.log(`[Debounce] API success for ${itemKey}`);
    } catch (err) {
      console.error(`[Debounce] API error for ${itemKey}:`, err);
      // Rollback - eski değere dön
      setCartItems(prev => prev.map(item => 
        item.id === cartItemId 
          ? { ...item, quantity: originalQuantity }
          : item
      ));
      setError('Miktar güncellenirken hata oluştu');
    } finally {
      // Pending'den kaldır
      pendingQuantities.current.delete(itemKey);
      setPendingUpdates(prev => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
      
      // Tüm güncellemeler bitti mi?
      if (pendingQuantities.current.size === 0) {
        setIsUpdatingQuantity(false);
      }
    }
  }, [token]);

  // Miktar güncelle - Debounced & Optimistic
  const updateQuantity = useCallback((productId: number, sellerName: string, newQuantity: number): void => {
    if (!token) {
      setError('Giriş yapmanız gerekiyor');
      return;
    }

    const cartItem = cartItems.find(
      item => item.product.id === productId && item.sellerName === sellerName
    );

    if (!cartItem) {
      console.warn('Cart item not found for update');
      return;
    }

    const effectiveMaxStock = Math.min(cartItem.product.currentStock, MAX_ALLOWED_QUANTITY);
    const validatedQuantity = Math.max(1, Math.min(newQuantity, effectiveMaxStock));
    
    // Miktar 0 veya daha az ise sil (debounce etmeden)
    if (newQuantity <= 0) {
      removeFromCart(productId, sellerName);
      return;
    }

    const itemKey = `${productId}-${sellerName}`;
    
    // 🚀 OPTIMISTIC UPDATE - UI anında güncellenir
    console.log(`[Optimistic] UI updated to: ${validatedQuantity}`);
    setCartItems(prev => prev.map(item => 
      item.id === cartItem.id 
        ? { ...item, quantity: validatedQuantity }
        : item
    ));
    
    // İşlem var olarak işaretle
    setIsUpdatingQuantity(true);
    setPendingUpdates(prev => new Set(prev).add(itemKey));
    
    // Orijinal değeri kaydet (rollback için) - sadece ilk kez
    if (!pendingQuantities.current.has(itemKey)) {
      pendingQuantities.current.set(itemKey, {
        cartItemId: cartItem.id,
        quantity: validatedQuantity,
        originalQuantity: cartItem.quantity
      });
    } else {
      // Sadece quantity'yi güncelle
      const existing = pendingQuantities.current.get(itemKey)!;
      pendingQuantities.current.set(itemKey, {
        ...existing,
        quantity: validatedQuantity
      });
    }
    
    // Önceki timer'ı iptal et
    const existingTimer = debounceTimers.current.get(itemKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Yeni debounce timer başlat
    const timer = setTimeout(() => {
      debounceTimers.current.delete(itemKey);
      executeQuantityUpdate(itemKey);
    }, DEBOUNCE_DELAY);
    
    debounceTimers.current.set(itemKey, timer);
  }, [token, cartItems, removeFromCart, executeQuantityUpdate]);
  
  // Cleanup: Component unmount olduğunda timer'ları temizle
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach(timer => clearTimeout(timer));
      debounceTimers.current.clear();
    };
  }, []);

  // Sepeti temizle
  const clearCart = useCallback(async () => {
    if (!token) {
      setError('Giriş yapmanız gerekiyor');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await cartService.clearCart(token);
      setCartItems([]);
    } catch (err) {
      console.error("Sepet temizlenirken hata:", err);
      setError('Sepet temizlenirken hata oluştu');
      await fetchCart(); // Hata durumunda yeniden yükle
    } finally {
      setLoading(false);
    }
  }, [token, fetchCart]);

  // Sepet sayacı
  const unreadCartItemCount = useMemo(() => {
    return cartItems.length;
  }, [cartItems]);

  // Stabilize refreshCart reference
  const refreshCart = useCallback(async () => {
    await fetchCart(true);
  }, [fetchCart]);

  // Context value
  const contextValue = useMemo(() => ({
    cartItems, 
    loading,
    error,
    isUpdatingQuantity,
    pendingUpdates,
    addToCart, 
    removeFromCart, 
    updateQuantity, 
    clearCart,
    refreshCart,
    unreadCartItemCount
  }), [
    cartItems, 
    loading,
    error,
    isUpdatingQuantity,
    pendingUpdates,
    addToCart, 
    removeFromCart, 
    updateQuantity, 
    clearCart,
    // fetchCart depends on context which depends on token. fetchCart is stable.
    refreshCart, // Now stable
    unreadCartItemCount
  ]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart, CartProvider içinde kullanılmalıdır');
  }
  return context;
};