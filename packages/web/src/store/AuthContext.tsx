"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

import { User as BackendUser } from '@/types';

export interface User extends BackendUser {
  pharmacyName?: string;
  pharmacyId: number;
  publicId?: string;
  username?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User, rememberMe?: boolean) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API base URL - Use relative URL for Next.js proxy (same as authService)
const API_BASE_URL = '';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to clear all auth cookies
  const clearAuthCookies = () => {
    if (typeof document !== 'undefined') {
      document.cookie = "auth_status=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  };

  useEffect(() => {
    // Token artık sadece HttpOnly Cookie üzerinden yönetilir (XSS koruması)
    // Backend /api/auth/me endpoint'inden kullanıcı bilgisi alınır
    const initializeAuth = async () => {
      try {
        // Cookie'den token varlığını kontrol et (HttpOnly cookie'lere erişilemez,
        // bu yüzden backend'den kullanıcı bilgisi istiyoruz)
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          method: 'GET',
          credentials: 'include', // Cookie'leri gönder
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setToken('cookie-managed'); // Token cookie'de, sadece authenticated state için
        } else {
          // Cookie geçersiz veya yok - tüm auth cookie'lerini temizle
          console.log('[Auth] Session invalid, clearing cookies...');
          clearAuthCookies();
          setUser(null);
          setToken(null);
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        // Network hatası varsa da cookie'leri temizle (stale state'i önle)
        clearAuthCookies();
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = (newToken: string, userData: User, rememberMe: boolean = true) => {
    // Token backend tarafından HttpOnly, Secure, SameSite=Strict cookie olarak set edilir
    // Frontend sadece user state'i tutar
    
    // Cookie'yi set et (HttpOnly olmayan, sadece presence check için)
    // Gerçek JWT token'ı backend Set-Cookie header'ı ile HttpOnly olarak set edilmeli
    const maxAge = rememberMe ? 86400 * 7 : undefined; // 7 gün veya session
    
    if (maxAge) {
      document.cookie = `auth_status=authenticated; path=/; max-age=${maxAge}; SameSite=Strict`;
    } else {
      document.cookie = `auth_status=authenticated; path=/; SameSite=Strict`;
    }
    
    setToken(newToken);
    setUser(userData);
  };

  const logout = async () => {
    try {
      // Backend'e logout isteği gönder (cookie'yi temizlemesi için)
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    }
    
    // Auth status cookie'sini temizle
    document.cookie = "auth_status=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    
    // State'leri sıfırla
    setToken(null);
    setUser(null);
    
    // Anasayfaya yönlendir (client-side navigation)
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
