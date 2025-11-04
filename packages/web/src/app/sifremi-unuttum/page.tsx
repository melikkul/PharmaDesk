"use client";

import { useState } from 'react';
import styles from './forgot-password.module.css';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Lütfen e-posta adresinizi girin.');
      return;
    }

    // --- BURADA API'NİZE İSTEK ATACAKSINIZ ---
    try {
      // Örnek API isteği (bu endpoint'i .NET API'de oluşturmalısınız)
      // const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email }),
      // });

      // if (!response.ok) {
      //   const data = await response.json();
      //   throw new Error(data.message || 'E-posta gönderilemedi.');
      // }
      
      // Geçici olarak başarılı senaryoyu simüle ediyoruz:
      console.log('Sıfırlama talebi gönderildi:', email);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 saniye bekle

      setMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2>Şifremi Unuttum</h2>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '1rem' }}>
        Şifrenizi sıfırlamak için kayıtlı e-posta adresinizi girin.
      </p>
      
      <div className={styles.inputGroup}>
        <input
          type="email"
          placeholder="E-posta Adresiniz"
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <button type="submit" className={styles.button}>
        Sıfırlama Bağlantısı Gönder
      </button>

      {message && <p style={{ color: 'green', textAlign: 'center' }}>{message}</p>}
      {error && <p className={styles.errorMessage}>{error}</p>}

      <div className={styles.links}>
        <Link href="/login">Giriş Yap'a Geri Dön</Link>
      </div>
    </form>
  );
}