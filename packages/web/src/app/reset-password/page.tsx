"use client";

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './form.module.css'; // Ortak stili kullan
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Geçersiz veya eksik sıfırlama anahtarı.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Şifreler uyuşmuyor.');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    // --- API ÇAĞRISI BURADA YAPILACAK ---
    try {
      console.log('Yeni şifre ayarlanıyor, token:', token);
      // const response = await fetch('/api/auth/reset-password', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token, password }),
      // });
      // if (!response.ok) throw new Error('Şifre sıfırlanamadı.');

      // Başarılı simülasyonu
      setMessage('Şifreniz başarıyla güncellendi. Giriş sayfasına yönlendiriliyorsunuz...');
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu. Token geçersiz veya süresi dolmuş olabilir.');
    }
  };

  if (!token) {
    return (
      <div className={styles.formContainer}>
        <div className={styles.form}>
          <h2>Geçersiz İstek</h2>
          <p className={styles.errorMessage}>
            Sıfırlama bağlantısı geçersiz veya süresi dolmuş.
          </p>
          <div className={styles.links}>
            <Link href="/login">Giriş Yap'a Geri Dön</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.formContainer}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2>Yeni Şifre Belirle</h2>

        <div className={styles.inputGroup}>
          <input
            type="password"
            placeholder="Yeni Şifre"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className={styles.inputGroup}>
          <input
            type="password"
            placeholder="Yeni Şifre (Tekrar)"
            className={styles.input}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {message && <p className={styles.successMessage}>{message}</p>}
        {error && <p className={styles.errorMessage}>{error}</p>}

        <button type="submit" className={styles.button}>
          Şifreyi Güncelle
        </button>
      </form>
    </div>
  );
}

// useSearchParams kullandığımız için Suspense sarmalayıcısı şarttır.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}