"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { authService } from "@/services/authService";

import { User as BackendUser } from '@/types';

export interface User extends BackendUser {
  pharmacyName?: string;
  pharmacyId: number;
  publicId?: string;
  username?: string;
  // 🆕 SaaS Subscription Fields
  subscriptionStatus?: string; // Active, Trial, PastDue, Cancelled
  subscriptionExpireDate?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, userData: User, rememberMe?: boolean) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  // 🆕 SignalR subscription sync
  updateSubscription: (status: string, expireDate?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// API base URL - Use relative URL for Next.js proxy (same as authService)
const API_BASE_URL = '';

// Token refresh interval (14 minutes = 840000 ms)
// Access token expires in 15 minutes, refresh 1 minute before
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to clear all auth cookies
  const clearAuthCookies = () => {
    if (typeof document !== 'undefined') {
      document.cookie = "auth_status=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  };

  // Start the token refresh cycle
  const startTokenRefresh = () => {
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Set up automatic token refresh
    refreshIntervalRef.current = setInterval(async () => {
      console.log('[Auth] Refreshing access token...');
      const result = await authService.refreshToken();
      if (result) {
        console.log('[Auth] Token refreshed successfully');
        setToken(result.accessToken);
      } else {
        console.log('[Auth] Token refresh failed, logging out...');
        // Refresh failed - logout user
        stopTokenRefresh();
        clearAuthCookies();
        setUser(null);
        setToken(null);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }, TOKEN_REFRESH_INTERVAL);
  };

  // Stop the token refresh cycle
  const stopTokenRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setToken('cookie-managed');
          // Start token refresh cycle for authenticated users
          startTokenRefresh();
        } else {
          console.log('[Auth] Session invalid, clearing cookies...');
          clearAuthCookies();
          setUser(null);
          setToken(null);
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        clearAuthCookies();
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Cleanup on unmount
    return () => {
      stopTokenRefresh();
    };
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

  // 🆕 SignalR subscription sync - update user subscription state in real-time
  const updateSubscription = (status: string, expireDate?: string) => {
    if (user) {
      setUser({
        ...user,
        subscriptionStatus: status,
        subscriptionExpireDate: expireDate
      });
      console.log('[Auth] Subscription updated via SignalR:', status, expireDate);
    }
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
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, isLoading, updateSubscription }}>
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
