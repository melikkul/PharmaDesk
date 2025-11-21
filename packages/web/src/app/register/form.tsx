"use client";

import "./form.css";
import { useIMask } from "react-imask";
import { useState, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Form() {
  const [formData, setFormData] = useState({
    isim: "",
    soyisim: "",
    email: "",
    sifre: "",
    tekrarSifre: "",
    eczaneAdi: "",
  });
  
  const [errors, setErrors] = useState<{[key: string]: boolean}>({});
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === 'isim' || id === 'soyisim') {
      setFormData(prev => ({ ...prev, [id]: value.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ\s]/g, '') }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: false }));
    setErrorMessage("");
  }, [errors]);

  const { ref: phoneRef, value: phoneValue } = useIMask<HTMLInputElement>({
    mask: '(\\0\\500) 000 00 00', lazy: false
  });

  const { ref: glnRef, value: glnValue } = useIMask<HTMLInputElement>({
    mask: '0000000000000', lazy: true, overwrite: true
  });
  
  const handleGlnChange = () => {
      if(errors.gln) setErrors(prev => ({...prev, gln: false}));
  };

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    
    // Validasyonlar
    const newErrors: {[key: string]: boolean} = {};
    if (!formData.isim.trim()) newErrors.isim = true;
    if (!formData.soyisim.trim()) newErrors.soyisim = true;
    if (!formData.eczaneAdi.trim()) newErrors.eczaneAdi = true;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email)) newErrors.email = true;
    
    if (!formData.sifre.trim() || formData.sifre.length < 6) newErrors.sifre = true; // Min 6 chars
    if (!formData.tekrarSifre.trim()) newErrors.tekrarSifre = true;
    
    const cleanGln = glnValue.replace(/[^0-9]/g, '');
    if (cleanGln.length !== 13) newErrors.gln = true;

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setErrorMessage("Lütfen tüm alanları eksiksiz ve doğru doldurunuz.");
        return;
    }

    if (formData.sifre !== formData.tekrarSifre) {
      setErrors({ sifre: true, tekrarSifre: true });
      setErrorMessage("Şifreler uyuşmuyor.");
      return;
    }

    // VERİ PAKETLEME (Backend DTO ile eşleşmeli)
    const step1Data = {
      FirstName: formData.isim,
      LastName: formData.soyisim,
      Email: formData.email,
      Password: formData.sifre,
      PhoneNumber: phoneValue,
      GLN: cleanGln,
      PharmacyName: formData.eczaneAdi
    };

    // Konsola yazdıralım (F12 ile görünür)
    console.log("Step 1 Verileri Kaydediliyor:", step1Data);

    sessionStorage.setItem('registerStep1', JSON.stringify(step1Data));
    router.push('/register/step2');
  }, [formData, glnValue, phoneValue, router]);

  return (
    <div className="container">
      <div className="form-panel">
        <h1>Kayıt Ekranı</h1>
        <form onSubmit={handleSubmit}>
          <div className="input-group-row">
            <div className="input-wrapper">
              <i className="fa-regular fa-user"></i>
              <input type="text" id="isim" className={errors.isim ? "error" : ""} placeholder=" " value={formData.isim} onChange={handleInputChange} />
              <label htmlFor="isim">İsim</label>
            </div>
            <div className="input-wrapper">
              <i className="fa-regular fa-user"></i>
              <input type="text" id="soyisim" className={errors.soyisim ? "error" : ""} placeholder=" " value={formData.soyisim} onChange={handleInputChange} />
              <label htmlFor="soyisim">Soyisim</label>
            </div>
          </div>

          <div className="input-wrapper">
            <i className="fa-regular fa-envelope"></i>
            <input type="email" id="email" className={errors.email ? "error" : ""} placeholder=" " value={formData.email} onChange={handleInputChange} />
            <label htmlFor="email">Email</label>
          </div>

          <div className="input-wrapper">
            <i className="fa-solid fa-clinic-medical"></i>
            <input type="text" id="eczaneAdi" className={errors.eczaneAdi ? "error" : ""} placeholder=" " value={formData.eczaneAdi} onChange={handleInputChange} />
            <label htmlFor="eczaneAdi">Eczane Adı</label>
          </div>

          <div className="input-wrapper">
            <i className="fa-solid fa-phone"></i>
            <input ref={phoneRef} id="telefon" type="tel" placeholder=" " />
            <label htmlFor="telefon">Telefon</label>
          </div>

          <div className="input-wrapper">
            <input ref={glnRef} type="text" id="gln" className={`no-icon ${errors.gln ? "error" : ""}`} placeholder=" " onChange={handleGlnChange} />
            <label htmlFor="gln" className="no-icon-label">GLN Numarası</label>
          </div>

          <div className="input-group-row">
            <div className="input-wrapper">
              <i className="fa-solid fa-lock"></i>
              <input type="password" id="sifre" className={errors.sifre ? "error" : ""} placeholder=" " value={formData.sifre} onChange={handleInputChange} />
              <label htmlFor="sifre">Şifre</label>
            </div>
            <div className="input-wrapper">
              <i className="fa-solid fa-lock"></i>
              <input type="password" id="tekrarSifre" className={errors.tekrarSifre ? "error" : ""} placeholder=" " value={formData.tekrarSifre} onChange={handleInputChange} />
              <label htmlFor="tekrar-sifre">Tekrar Şifre</label>
            </div>
          </div>

          {errorMessage && <div className="error-message">{errorMessage}</div>}
          <button type="submit" className="btn btn-primary">Devam Et</button>
        </form>
        <div className="bottom-buttons-container">
          <Link href="/login" className="btn btn-secondary">Geri Dön</Link>
        </div>
      </div>
      <div className="image-panel"><img src="/Register.png" alt="Kayıt" /></div>
    </div>
  );
}