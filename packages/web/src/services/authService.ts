
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

import { LoginResponse } from '../types';

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  forgotPassword: async (email: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      body: JSON.stringify({ token, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Şifre sıfırlanamadı.");
    }
  }
};
