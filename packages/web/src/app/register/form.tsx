"use client";

import "./form.css";
import { useIMask } from "react-imask";
import { useState, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function Form() {
  const [formData, setFormData] = useState({
    isim: "",
    soyisim: "",
    email: "",
    sifre: "",
    tekrarSifre: "",
  });
  
  // Hatalı inputları takip eden state
  const [errors, setErrors] = useState<{[key: string]: boolean}>({});
  // Formun genel hata mesajı
  const [generalError, setGeneralError] = useState("");

  const router = useRouter();

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    
    if (id === 'isim' || id === 'soyisim') {
      const filteredValue = value.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ\s]/g, '');
      setFormData(prev => ({ ...prev, [id]: filteredValue }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }

    // Kullanıcı yazarken hatayı temizle
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: false }));
    }
    if (generalError) setGeneralError("");
  }, [errors, generalError]);

  const { ref: phoneRef, value: phoneValue } = useIMask<HTMLInputElement>({
    mask: '(\\0\\500) 000 00 00',
    lazy: false,
  });

  const { ref: glnRef, value: glnValue } = useIMask<HTMLInputElement>({
    mask: '0000000000000',
    lazy: true,
    overwrite: true,
  });
  
  // GLN değişimini takip edip hatayı silmek için
  const handleGlnChange = () => {
      if(errors.gln) setErrors(prev => ({...prev, gln: false}));
      if(generalError) setGeneralError("");
  };

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    
    const newErrors: {[key: string]: boolean} = {};
    let hasError = false;

    // Boş alan kontrolü
    if (!formData.isim) newErrors.isim = true;
    if (!formData.soyisim) newErrors.soyisim = true;
    if (!formData.email) newErrors.email = true;
    if (!formData.sifre) newErrors.sifre = true;
    if (!formData.tekrarSifre) newErrors.tekrarSifre = true;
    
    // GLN Kontrolü (13 hane olmalı)
    const cleanGln = glnValue.replace(/[^0-9]/g, '');
    if (cleanGln.length !== 13) {
        newErrors.gln = true;
    }

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setGeneralError("Lütfen tüm alanları eksiksiz doldurunuz.");
        return;
    }

    // Şifre Eşleşme Kontrolü
    if (formData.sifre !== formData.tekrarSifre) {
      setErrors({ sifre: true, tekrarSifre: true });
      setGeneralError("Şifreler uyuşmuyor.");
      return;
    }

    // Başarılı Validasyon
    console.log("Kayıt Verileri:", {
      ...formData,
      telefon: phoneValue,
      gln: glnValue,
    });

    router.push('/register/step2');
  }, [formData, glnValue, phoneValue, router]);

  return (
    <div className="container">
      <div className="form-panel" onDrop={(e) => e.preventDefault()} onDragOver={(e) => e.preventDefault()}>
        <h1>Kayıt Ekranı</h1>
        <form onSubmit={handleSubmit}>
          <div className="input-group-row">
            <div className="input-wrapper">
              <i className="fa-regular fa-user"></i>
              <input 
                type="text" id="isim" 
                className={errors.isim ? "error" : ""}
                placeholder=" " value={formData.isim} onChange={handleInputChange} 
              />
              <label htmlFor="isim">İsim</label>
            </div>
            <div className="input-wrapper">
              <i className="fa-regular fa-user"></i>
              <input 
                type="text" id="soyisim" 
                className={errors.soyisim ? "error" : ""}
                placeholder=" " value={formData.soyisim} onChange={handleInputChange} 
              />
              <label htmlFor="soyisim">Soyisim</label>
            </div>
          </div>

          <div className="input-wrapper">
            <i className="fa-regular fa-envelope"></i>
            <input 
              type="email" id="email" 
              className={errors.email ? "error" : ""}
              placeholder=" " value={formData.email} onChange={handleInputChange} 
            />
            <label htmlFor="email">Email</label>
          </div>

          <div className="input-wrapper">
            <i className="fa-solid fa-phone"></i>
            <input ref={phoneRef} id="telefon" type="tel" placeholder=" " />
            <label htmlFor="telefon">Telefon</label>
          </div>

          <div className="input-wrapper">
            <input 
              ref={glnRef} type="text" id="gln" 
              className={`no-icon ${errors.gln ? "error" : ""}`}
              placeholder=" " 
              onChange={handleGlnChange} 
            />
            <label htmlFor="gln" className="no-icon-label">GLN Numarası</label>
          </div>

          <div className="input-group-row">
            <div className="input-wrapper">
              <i className="fa-solid fa-lock"></i>
              <input 
                type="password" id="sifre" 
                className={errors.sifre ? "error" : ""}
                placeholder=" " value={formData.sifre} onChange={handleInputChange} 
              />
              <label htmlFor="sifre">Şifre</label>
              <i className="fa-regular fa-eye-slash password-toggle"></i>
            </div>
            <div className="input-wrapper">
              <i className="fa-solid fa-lock"></i>
              <input 
                type="password" id="tekrarSifre" 
                className={errors.tekrarSifre ? "error" : ""}
                placeholder=" " value={formData.tekrarSifre} onChange={handleInputChange} 
              />
              <label htmlFor="tekrar-sifre">Tekrar Şifre</label>
            </div>
          </div>

          {/* Hata Mesajı */}
          {generalError && <div className="error-message">{generalError}</div>}

          <button type="submit" className="btn btn-primary">
            Kayıt
          </button>
        </form>

        <div className="bottom-buttons-container">
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
            Geri Dön
          </button>
        </div>
      </div>

      <div className="image-panel">
        <img src="/Register.png" alt="Eczane İllüstrasyonu" />
      </div>

      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" style={{ display: 'none' }}>
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="10"></feGaussianBlur>
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 21 -7" result="goo"></feColorMatrix>
            <feBlend in2="goo" in="SourceGraphic" result="mix"></feBlend>
          </filter>
        </defs>
      </svg>
    </div>
  );
}