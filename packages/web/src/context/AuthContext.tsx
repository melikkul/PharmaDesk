"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface User {
  fullName: string;
  pharmacyName: string;
  pharmacyId?: string; // Changed to string to match backend MessageDto
  publicId?: string;
  username?: string; // Email or username for routing
  email?: string;
  isFirstLogin?: boolean;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for token in localStorage or sessionStorage on mount
    const storedToken = localStorage.getItem("token") || sessionStorage.getItem("token");
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    
    if (storedToken) {
      setToken(storedToken);
      if (storedUser) {
          try {
              setUser(JSON.parse(storedUser));
          } catch (e) {
              console.error("Failed to parse stored user", e);
          }
      }
    } else {
      // Prevent middleware loop: if no token, ensure cookie is gone
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, userData: User, rememberMe: boolean = true) => {
    if (rememberMe) {
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(userData));
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      document.cookie = `token=${newToken}; path=/; max-age=86400; SameSite=Strict`; // 1 day
    } else {
      sessionStorage.setItem("token", newToken);
      sessionStorage.setItem("user", JSON.stringify(userData));
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      document.cookie = `token=${newToken}; path=/; SameSite=Strict`; // Session cookie
    }
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    // Tüm storage verilerini temizle
    localStorage.clear();
    sessionStorage.clear();
    
    // Cookie'yi temizle
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    
    // State'leri sıfırla
    setToken(null);
    setUser(null);
    
    // Anasayfaya yönlendir
    router.push("/");
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
