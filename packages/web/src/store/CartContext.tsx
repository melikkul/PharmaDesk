// s../store/CartContext.tsx
'use client';

// ### OPTİMİZASYON: 'useCallback' import edildi ###
import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect, useCallback } from 'react';
import { ShowroomMedication } from '../lib/dashboardData';

// ... (CartItem, CartContextType arayüzleri aynı) ...
export interface CartItem {
  product: ShowroomMedication;
  quantity: number;
  sellerName: string;
}
interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: ShowroomMedication, quantity: number, sellerName: string) => void;
  removeFromCart: (productId: number, sellerName: string) => void;
  updateQuantity: (productId: number, sellerName: string, newQuantity: number) => void;
  clearCart: () => void;
  unreadCartItemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const CART_STORAGE_KEY = 'pharmaDeskCart';
const MAX_ALLOWED_QUANTITY = 1000;

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    // ... (localStorage okuma kısmı aynı) ...
     if (typeof window !== 'undefined') {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);
      try {
        return storedCart ? JSON.parse(storedCart) : [];
      } catch (error) {
        console.error("Sepet verisi localStorage'dan okunurken hata:", error);
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    // ... (localStorage yazma kısmı aynı) ...
     if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
      } catch (error) {
        console.error("Sepet verisi localStorage'a kaydedilirken hata:", error);
      }
    }
  }, [cartItems]);

  // ### OPTİMİZASYON: useCallback ###
  // Sepete ekleme fonksiyonu memoize edildi.
  const addToCart = useCallback((product: ShowroomMedication, quantity: number, sellerName: string) => {
    const effectiveMaxStock = Math.min(product.currentStock, MAX_ALLOWED_QUANTITY);
    // Eklenecek miktar olarak inputtan gelen değeri al, en az 1 olsun.
    const quantityFromInput = Math.max(1, quantity);

    setCartItems(prevItems => {
      // Önceki state'in kopyası üzerinde çalışalım
      const newItems = [...prevItems];
      const existingItemIndex = newItems.findIndex(
        item => item.product.id === product.id && item.sellerName === sellerName
      );

      if (existingItemIndex > -1) {
        // Ürün zaten sepetteyse:
        const currentItem = newItems[existingItemIndex];
        const currentQuantity = currentItem.quantity;

        // Hesaplanan yeni miktar: mevcut + inputtan gelen (limiti aşmayacak şekilde)
        const updatedQuantity = Math.min(currentQuantity + quantityFromInput, effectiveMaxStock);

        // Sadece miktar gerçekten değiştiyse güncelle
        if (updatedQuantity !== currentQuantity) {
             newItems[existingItemIndex] = { ...currentItem, quantity: updatedQuantity };
             return newItems; // Güncellenmiş listeyi döndür
        } else {
             // Miktar değişmediyse (limit nedeniyle veya eklenen 0 ise),
             // state'i değiştirmemek için önceki listeyi döndür
             return prevItems;
        }

      } else {
        // Yeni ürün ekleniyorsa:
        // Eklenecek ilk miktar, limiti aşmamalı.
        const initialQuantity = Math.min(quantityFromInput, effectiveMaxStock);
         if (initialQuantity > 0) {
             // Yeni ürünü listeye ekle
             return [...newItems, { product, quantity: initialQuantity, sellerName }];
         }
         // Eklenecek miktar 0 ise (limit nedeniyle), listeyi değiştirme
         return prevItems;
      }
    });
  }, []); // Bağımlılığı yok, çünkü 'setCartItems' state updater'ı stabildir.

  // ### OPTİMİZASYON: useCallback ###
  const removeFromCart = useCallback((productId: number, sellerName: string) => {
    setCartItems(prevItems =>
      prevItems.filter(item => !(item.product.id === productId && item.sellerName === sellerName))
    );
  }, []); // Bağımlılığı yok

  // ### OPTİMİZASYON: useCallback ###
  // 'cartItems'a bağımlı, ancak bu fonksiyonun kendisi bir bağımlılıkta kullanılmıyor,
  // bu yüzden 'cartItems'ı eklememek (veya eklemek) büyük bir fark yaratmaz,
  // ancak 'removeFromCart'a bağımlı hale getirmek en doğrusudur.
  const updateQuantity = useCallback((productId: number, sellerName: string, newQuantity: number) => {
     
     // 'cartItems'a doğrudan erişmek yerine 'setCartItems'in callback formunu kullanmak
     // 'cartItems' bağımlılığını kaldırır ve fonksiyonu daha stabil hale getirir.
     setCartItems(prevItems => {
        const itemToUpdate = prevItems.find(item => item.product.id === productId && item.sellerName === sellerName);
        if (!itemToUpdate) return prevItems; // Değişiklik yoksa aynı state'i döndür

        const effectiveMaxStock = Math.min(itemToUpdate.product.currentStock, MAX_ALLOWED_QUANTITY);
        const validatedQuantity = Math.max(0, Math.min(newQuantity, effectiveMaxStock));

        if (validatedQuantity <= 0) {
          // 'removeFromCart' mantığını doğrudan burada uygula
          return prevItems.filter(item => !(item.product.id === productId && item.sellerName === sellerName));
        }

        return prevItems.map(item =>
          item.product.id === productId && item.sellerName === sellerName
            ? { ...item, quantity: validatedQuantity }
            : item
        );
     });
  }, []); // Bağımlılık kaldırıldı ('setCartItems' callback formu sayesinde)

  // ### OPTİMİZASYON: useCallback ###
  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []); // Bağımlılığı yok

  // ### OPTİMİZASYON: useMemo ###
  // Sepet sayacı, sadece 'cartItems' değiştiğinde yeniden hesaplanır.
  const unreadCartItemCount = useMemo(() => {
    return cartItems.length;
  }, [cartItems]);


  // ### OPTİMİZASYON: useMemo ###
  // Provider'a geçirilen 'value' objesi memoize edildi.
  // Bu, 'cartItems', 'unreadCartItemCount' veya memoize edilmiş fonksiyonlar değişmediği sürece
  // context tüketicilerinin gereksiz yere render olmasını engeller.
  const contextValue = useMemo(() => ({
      cartItems, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      unreadCartItemCount
  }), [
      cartItems, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      unreadCartItemCount
  ]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  // ... (hook aynı) ...
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart, CartProvider içinde kullanılmalıdır');
  }
  return context;
};