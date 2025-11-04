"use client";

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './reset-password.module.css';
import Link from 'next/link';

// Suspense içinde sarmalanacak ana component
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // URL'den 'token' parametresini oku
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

    // --- BURADA API'NİZE İSTEK ATACAKSINIZ ---
    try {
      // Örnek API isteği (bu endpoint'i .NET API'de oluşturmalısınız)
      // const response = await fetch('http://localhost:5000/api/auth/reset-password', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token, password }),
      // });

      // if (!response.ok) {
      //   const data = await response.json();
      //   throw new Error(data.message || 'Şifre sıfırlanamadı.');
      // }

      // Geçici olarak başarılı senaryoyu simüle ediyoruz:
      console.log('Yeni şifre ayarlandı. Token:', token);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 saniye bekle
      
      setMessage('Şifreniz başarıyla güncellendi. Giriş sayfasına yönlendiriliyorsunuz...');
      
      // Kullanıcıyı 3 saniye sonra login'e yönlendir
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu. Token geçersiz veya süresi dolmuş olabilir.');
    }
  };

  // Token yoksa formu hiç gösterme
  if (!token) {
    return (
      <div className={styles.form}>
        <h2>Geçersiz İstek</h2>
        <p className={styles.errorMessage}>Sıfırlama bağlantısı geçersiz veya süresi dolmuş.</p>
        <div className={styles.links}>
          <Link href="/login">Giriş Yap'a Geri Dön</Link>
        </div>
      </div>
    );
  }

  // Token varsa yeni şifre formunu göster
  return (
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

      <button type="submit" className={styles.button}>
        Şifreyi Güncelle
      </button>

      {message && <p style={{ color: 'green', textAlign: 'center' }}>{message}</p>}
      {error && <p className={styles.errorMessage}>{error}</p>}
    </form>
  );
}

// useSearchParams kullandığımız için ana sayfayı Suspense ile sarmalıyız.
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Yükleniyor...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}