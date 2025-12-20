'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios, { AxiosInstance } from 'axios';

// Kullanıcı (User) veri tipini merkezi olarak tanımlar.
export interface User {
  name: string;
  email: string;
}

// Context'in taşıyacağı değerlerin tipini tanımlar.
interface AuthContextType {
  user: User | null;
  api: AxiosInstance;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
}

// API istekleri için merkezi bir Axios instance'ı oluşturuyoruz.
// BaseURL boş bırakılır ki istekler Next.js proxy üzerinden gitsin
const api = axios.create({
  baseURL: '', // Next.js rewrite proxy kullanır
  withCredentials: true, // HttpOnly cookie desteği için gerekli
});

// Request interceptor - her istekte token'ı kontrol et ve ekle
api.interceptors.request.use(
  (config) => {
    // Token'ı storage'dan al (her istekte güncel kontrolü yapar)
    const storedToken = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
    if (storedToken && config.headers) {
      config.headers['Authorization'] = `Bearer ${storedToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - 401 hatalarında login'e yönlendir
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If 401, clear tokens and redirect to login
    if (error.response?.status === 401) {
      // Clear tokens
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_user');
      
      // Redirect to login (avoid infinite loop by checking current path)
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);


// AuthContext'i oluşturuyoruz. Başlangıç değeri undefined olacak.
const AuthContext = createContext<AuthContextType | undefined>(undefined); 

// Uygulamayı sarmalayacak olan Provider bileşenini oluşturuyoruz.
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
      const storedUser = localStorage.getItem('admin_user') || sessionStorage.getItem('admin_user');

      if (storedToken && storedUser) {
        const userData: User = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (error) {
      console.error('Failed to initialize auth state from storage', error);
      // Hata durumunda depolamayı temizle
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      const response = await api.post('/api/admin/login', { email, password, rememberMe });
      // Support both accessToken (new) and token (legacy) response formats
      const accessToken = response.data.accessToken || response.data.token;
      const user = response.data.user;

      if (accessToken && user) {
        if (rememberMe) {
          localStorage.setItem('admin_token', accessToken);
          localStorage.setItem('admin_user', JSON.stringify(user));
          sessionStorage.removeItem('admin_token');
          sessionStorage.removeItem('admin_user');
        } else {
          sessionStorage.setItem('admin_token', accessToken);
          sessionStorage.setItem('admin_user', JSON.stringify(user));
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
        }
        
        setToken(accessToken);
        setUser(user);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        router.push('/dashboard');
      } else {
        throw new Error('Login failed: No token or user data received.');
      }
    } catch (error) {
      console.error('Login failed', error);
      throw error; // Re-throw the error to be caught by the calling component
    }
  }, [router]);

  const logout = useCallback(() => {
    // Kullanıcı state'ini temizle
    setUser(null);
    setToken(null);
    // Token'ı local storage'dan kaldır (eğer kullanılıyorsa)
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
    delete api.defaults.headers.common['Authorization'];
    // Kullanıcıyı login sayfasına yönlendir
    router.push('/login');
  }, [router]);

  const value = { user, api, isLoading, logout, login, isAuthenticated: !!token };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Bu hata, useAuth'un AuthProvider dışında kullanılmasını engeller.
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};