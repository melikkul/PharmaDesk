"use client";

import "./form.css";
import { useState, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../store/AuthContext";
import { authService } from "../../services/authService";


export default function Form() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  useEffect(() => {
    // URL'de ?success=true varsa mesaj göster
    if (searchParams.get("success") === "true") {
        setSuccessMessage("Kayıt işleminiz başarıyla tamamlandı. Lütfen giriş yapınız.");
        // 3 saniye sonra mesajı kaldır
        const timer = setTimeout(() => {
            setSuccessMessage("");
            // URL'den query param'ı temizlemek istersek router.replace kullanabiliriz ama şimdilik kalsın
        }, 3000);
        return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setErrorMessage("");
  setSuccessMessage("");

  if (!email.trim() || !password.trim()) {
    setErrorMessage("Lütfen tüm alanları doldurunuz.");
    return;
  }

  try {
    const data = await authService.login(email, password, rememberMe);

    // Construct user object from response
    console.log('[Login] API Response data.user:', data.user);
    
    const userData = {
        ...data.user,
        pharmacyId: data.user.pharmacyId,
        username: data.user.email,
        isFirstLogin: data.isFirstLogin
    };
    
    console.log('[Login] Constructed userData:', userData);
    console.log('[Login] userData.pharmacyId:', userData.pharmacyId);
    
    login(data.accessToken || data.token || '', userData, rememberMe);
    // Force full page reload as requested
    window.location.href = "/dashboard";
  } catch (error: any) {
    // Check if this is a pending approval error - show with warning style
    const isPendingApproval = error.message?.includes("yönetici onayı");
    if (isPendingApproval) {
      setSuccessMessage(""); // Clear any success message
    }
    // More user-friendly error message for login failures
    const isAuthError = error.message?.includes("Invalid") || error.message?.includes("Unauthorized") || error.status === 401;
    if (isAuthError) {
      setErrorMessage("Email veya şifre hatalı. Kayıtlı değilseniz lütfen kayıt olun.");
    } else {
      setErrorMessage(error.message || "Giriş yapılamadı.");
    }
  }
};

  return (
    <div className="container">
      {/* TOAST NOTIFICATION */}
      {successMessage && (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#28a745',
            color: 'white',
            padding: '15px 25px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            animation: 'slideIn 0.5s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: '500'
        }}>
            <i className="fa-solid fa-check-circle"></i>
            {successMessage}
        </div>
      )}

      <div className="form-panel">
        <h1>Giriş Ekranı</h1>
        <form onSubmit={handleSubmit}>

          <div className="input-wrapper">
            <i className="fa-regular fa-envelope"></i>
            <input type="email" id="email" placeholder=" " value={email} onChange={(e) => setEmail(e.target.value)} />
            <label htmlFor="email">Email</label>
          </div>

          <div className="input-wrapper">
            <i className="fa-solid fa-lock"></i>
            <input type="password" id="sifre" placeholder=" " value={password} onChange={(e) => setPassword(e.target.value)} />
            <label htmlFor="sifre">Şifre</label>
          </div>

          <div className="remember-me-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <input 
              type="checkbox" 
              id="rememberMe" 
              checked={rememberMe} 
              onChange={(e) => setRememberMe(e.target.checked)} 
              style={{ width: 'auto', margin: 0 }}
            />
            <label htmlFor="rememberMe" style={{ position: 'static', transform: 'none', color: '#666', fontSize: '14px', pointerEvents: 'auto' }}>Beni Hatırla</label>
          </div>

          <Link href="/sifremi-unuttum" className="forgot-password">Şifremi Unuttum</Link>

          {errorMessage && <div className="error-message">{errorMessage}</div>}

          <div className="action-buttons-container">
            <button type="submit" className="btn btn-primary">Giriş</button>
            <Link href="/register" className="btn btn-primary">Kayıt</Link>
          </div>
        </form>
      </div>
      <div className="image-panel"><img src="/Login.png" alt="Giriş" /></div>
    </div>
  );
}