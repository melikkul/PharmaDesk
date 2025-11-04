"use client";

import { useState } from 'react';
import styles from './form.module.css'; // Hata veren satır buydu, şimdi dosyayı bulacak
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

    // --- API ÇAĞRISI BURADA YAPILACAK ---
    try {
      console.log('Sıfırlama talebi gönderiliyor:', email);
      // const response = await fetch('/api/auth/forgot-password', { ... });
      // if (!response.ok) throw new Error('E-posta gönderilemedi.');
      
      // Başarılı simülasyonu
      setMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  return (
    <div className={styles.formContainer}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2>Şifremi Unuttum</h2>
        <p style={{ textAlign: 'center', color: '#666', marginTop: '-1rem' }}>
          Kayıtlı e-posta adresinizi girin.
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

        {message && <p className={styles.successMessage}>{message}</p>}
        {error && <p className={styles.errorMessage}>{error}</p>}

        <button type="submit" className={styles.button}>
          Sıfırlama Bağlantısı Gönder
        </button>

        <div className={styles.links}>
          <Link href="/login">Giriş Yap'a Geri Dön</Link>
        </div>
      </form>
    </div>
  );
}