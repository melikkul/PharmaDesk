"use client";

import "./form.css";
import { useState, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function Form() {
  const [formData, setFormData] = useState({
    email: "",
    sifre: "",
  });

  // Hataları tutan state
  const [errors, setErrors] = useState({
    email: false,
    sifre: false,
  });

  // Sunucudan gelen mesajı tutan state
  const [errorMessage, setErrorMessage] = useState("");
  
  const router = useRouter();

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    
    // Yazmaya başladığında kırmızılığı kaldır
    if (errors[id as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [id]: false }));
    }
    if (errorMessage) setErrorMessage("");
  }, [errors, errorMessage]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // 1. İstemci Tarafı Validasyonu (Boş kontrolü)
    const newErrors = {
      email: formData.email.trim() === "",
      sifre: formData.sifre.trim() === "",
    };

    setErrors(newErrors);

    if (newErrors.email || newErrors.sifre) {
      setErrorMessage("Lütfen tüm alanları doldurunuz.");
      return;
    }

    // Validasyon başarılı ise API isteği at
    try {
      // DÜZELTME: Port numarası 5001 yerine 8081 yapıldı
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.sifre, // Backend DTO'suna uygun olarak 'password'
        }),
      });

      // Eğer backend'den JSON dönmezse (örn: 500 hatası) patlamaması için kontrol
      let data;
      try {
          data = await res.json();
      } catch (err) {
          console.error("JSON parse hatası:", err);
          setErrorMessage("Sunucudan geçersiz yanıt alındı.");
          return;
      }

      if (!res.ok) {
        // Backend'den gelen özel hata mesajını göster
        setErrorMessage(data.error || data.message || "Giriş yapılamadı.");
      } else {
        // Başarılı giriş
        console.log("Giriş Başarılı. Token:", data.token);
        
        // Token'ı kaydet (Localstorage veya Cookie)
        localStorage.setItem("token", data.token);
        
        // Yönlendir
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Bağlantı hatası:", error);
      setErrorMessage("Sunucuya bağlanılamadı. Backend'in çalıştığından emin olun (Port 8081).");
    }
  };

  return (
    <div className="container">
      <div className="form-panel">
        <h1>Giriş Ekranı</h1>
        <form onSubmit={handleSubmit}>
          <div className="input-wrapper">
            <i className="fa-regular fa-envelope"></i>
            <input
              type="email"
              id="email"
              className={errors.email ? "error" : ""}
              placeholder=" "
              value={formData.email}
              onChange={handleInputChange}
            />
            <label htmlFor="email">Email</label>
          </div>

          <div className="input-wrapper">
            <i className="fa-solid fa-lock"></i>
            <input
              type="password"
              id="sifre"
              className={errors.sifre ? "error" : ""}
              placeholder=" "
              value={formData.sifre}
              onChange={handleInputChange}
            />
            <label htmlFor="sifre">Şifre</label>
            <i className="fa-regular fa-eye-slash password-toggle"></i>
          </div>

          <a href="./sifremi-unuttum" className="forgot-password">
            Şifremi Unuttum
          </a>

          {/* Hata Mesajı Alanı */}
          {errorMessage && <div className="error-message">{errorMessage}</div>}

          <div className="action-buttons-container">
            <button type="submit" className="btn btn-primary">
            Giriş
            </button>
            <a href="./register" type="button" className="btn btn-primary">
            Kayıt
            </a>
          </div>
        </form>
      </div>

      <div className="image-panel">
        <img src="/Login.png" alt="Eczane İllüstrasyonu" />
      </div>
    </div>
  );
}