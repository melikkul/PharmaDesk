'use client';

import React, { useState, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password, rememberMe);
      router.replace('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || err.message || 'Giriş başarısız.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-surface rounded-2xl shadow-xl overflow-hidden flex w-full max-w-4xl h-[600px]">
        {/* Sol Taraf - Görsel */}
        <div className="hidden md:flex w-1/2 bg-primary items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/Login.png')] bg-cover bg-center opacity-50 mix-blend-overlay"></div>
          <div className="relative z-10 text-white text-center p-8">
            <h1 className="text-4xl font-bold mb-4">PharmaDesk</h1>
            <p className="text-lg opacity-90">Eczane Yönetim Paneli</p>
          </div>
        </div>

        {/* Sağ Taraf - Form */}
        <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
          <div className="text-center mb-8">
            <img src="/logoYesil.png" alt="PharmaDesk Logo" className="h-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-text-primary">Hoş Geldiniz</h2>
            <p className="text-text-secondary mt-2">Lütfen hesabınıza giriş yapın</p>
          </div>

          {error && (
            <div className="bg-danger/10 text-danger p-3 rounded-lg mb-6 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="email">
                E-posta Adresi
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="admin@pharmadesk.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor="password">
                Şifre
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="rememberMe" className="text-sm text-text-secondary cursor-pointer">
                Beni Hatırla
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}