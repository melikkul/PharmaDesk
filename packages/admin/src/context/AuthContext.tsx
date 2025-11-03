'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import axios from 'axios';

// API helper
const api = axios.create({
  baseURL: '/api', // Next.js proxy'sini kullan
});

interface User {
  id: number;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  api: typeof api; // API instance'ını context'e ekle
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // --- DEĞİŞİKLİK BAŞLANGICI: Backend bağlantısını kesmek ve direkt giriş için mock admin kullan ---
    // Sayfa yüklendiğinde token'ı localStorage'dan kontrol etmek yerine
    // doğrudan sahte bir admin kullanıcısı ve token atıyoruz.
    try {
      const mockUser = { id: 1, email: 'admin@pharmadesk.local', role: 'Admin' };
      const mockToken = 'mock-admin-token-bypassed-login';
      
      setUser(mockUser);
      setToken(mockToken);
      api.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
    } catch (e) {
      console.error("Mock admin oluşturulurken hata", e);
    }
    setIsLoading(false);
    // --- DEĞİŞİKLİK SONU ---
  }, []);

  const login = async (email: string, password: string) => {
    // --- DEĞİŞİKLİK BAŞLANGICI: Backend API çağrısı kaldırıldı ---
    console.log(`Login denemesi (backend bağlantısı kapalı): ${email}`);
    
    // Sadece göstermelik bir kontrol
    if (!email.includes('admin')) {
      throw new Error('Mock Login: Geçersiz e-posta.');
    }

    // Zaten useEffect'te giriş yapıldı, bu fonksiyonu göstermelik bırak.
    // İstenirse burada da state'i set edebilirdik.
    const mockUser = { id: 1, email: email, role: 'Admin' };
    const mockToken = 'mock-admin-token-bypassed-login';
    
    setUser(mockUser);
    setToken(mockToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
    
    return Promise.resolve();
    // --- DEĞİŞİKLİK SONU ---

    /* Orijinal kod:
    const { data } = await api.post('/auth/login', { email, password });
    
    // SADECE admin rolü olanlar giriş yapabilir
    if (data.user && data.user.role === 'admin') {
      setToken(data.token);
      setUser(data.user);
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.user));
    } else {
      throw new Error('Erişim reddedildi: Admin yetkisi gerekli.');
    }
    */
  };

  const logout = () => {
    // --- DEĞİŞİKLİK: Oturumun kapanmaması için bu kısmı da kapatabiliriz,
    // ancak şimdilik orijinal haliyle bırakıyorum.
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalıdır');
  }
  return context;
};