
const API_BASE_URL = ''; // Use relative URL for Next.js proxy

import { LoginResponse } from '../types';

export const authService = {
  /**
   * Login - Cookie is now set by backend as HttpOnly
   */
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // 🔒 Send cookies with request
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Giriş yapılamadı.");
    }

    // Normalize user data if needed
    if (data.user) {
        // Handle PascalCase from backend if present
        if ('PharmacyId' in data.user) {
            data.user.pharmacyId = data.user.PharmacyId;
        }
    }

    return data;
  },

  /**
   * Logout - Clears the HttpOnly cookie
   */
  logout: async (): Promise<void> => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include", // 🔒 Send cookies with request
      });
    } catch {
      // Ignore errors on logout
    }
    // Clear any local storage items (backward compatibility)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    }
  },

  forgotPassword: async (email: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Şifre sıfırlama isteği gönderilemedi.");
    }
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Şifre sıfırlanamadı.");
    }
  }
};

