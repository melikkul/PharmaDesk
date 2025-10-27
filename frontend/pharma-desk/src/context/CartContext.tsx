// src/context/CartContext.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { ShowroomMedication } from '../data/dashboardData';

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

  // --- YENİDEN GÖZDEN GEÇİRİLMİŞ addToCart ---
  const addToCart = (product: ShowroomMedication, quantity: number, sellerName: string) => {
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
  };

  // ... (removeFromCart, updateQuantity, clearCart, unreadCartItemCount aynı) ...
   const removeFromCart = (productId: number, sellerName: string) => {
    setCartItems(prevItems =>
      prevItems.filter(item => !(item.product.id === productId && item.sellerName === sellerName))
    );
  };
  const updateQuantity = (productId: number, sellerName: string, newQuantity: number) => {
     const itemToUpdate = cartItems.find(item => item.product.id === productId && item.sellerName === sellerName);
     if (!itemToUpdate) return;
     const effectiveMaxStock = Math.min(itemToUpdate.product.currentStock, MAX_ALLOWED_QUANTITY);
     const validatedQuantity = Math.max(0, Math.min(newQuantity, effectiveMaxStock));
    if (validatedQuantity <= 0) {
      removeFromCart(productId, sellerName);
      return;
    }
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.product.id === productId && item.sellerName === sellerName
          ? { ...item, quantity: validatedQuantity }
          : item
      )
    );
  };
  const clearCart = () => {
    setCartItems([]);
  };
  const unreadCartItemCount = useMemo(() => {
    return cartItems.length;
  }, [cartItems]);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, unreadCartItemCount }}>
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