"use client";

import "./form.css";
import Register from "../../../public/Login.png";
import { useIMask } from "react-imask";
// ### OPTİMİZASYON: 'useCallback' import edildi ###
import { useState, useCallback } from "react";

export default function Form() {
  const [formData, setFormData] = useState({
    isim: "",
    soyisim: "",
    email: "",
    glu: "",
    sifre: "",
    tekrarSifre: "",
  });

  // ### OPTİMİZASYON: useCallback ###
  // Form input fonksiyonu memoize edildi.
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    
    // 'setFormData'nın callback formunu kullanarak 'formData' bağımlılığından kurtulduk.
    if (id === 'isim' || id === 'soyisim') {
      const filteredValue = value.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ\s]/g, '');
      setFormData(prev => ({ ...prev, [id]: filteredValue }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  }, []); // Bağımlılığı yok

  const { ref: phoneRef } = useIMask({
    mask: '(\\0\\500) 000 00 00',
    lazy: false,
  });

  return (
    <div className="container">
      {/* --- DEĞİŞTİRİLEN SATIR --- */}
      <div className="form-panel" onDrop={(e) => e.preventDefault()} onDragOver={(e) => e.preventDefault()}>
        <h1>Kayıt Ekranı</h1>
        <form action="#">
          <div className="input-group-row">
            <div className="input-wrapper">
              <i className="fa-regular fa-user"></i>
              <input type="text" id="isim" placeholder=" " value={formData.isim} onChange={handleInputChange} />
              <label htmlFor="isim">İsim</label>
            </div>
            <div className="input-wrapper">
              <i className="fa-regular fa-user"></i>
              <input type="text" id="soyisim" placeholder=" " value={formData.soyisim} onChange={handleInputChange} />
              <label htmlFor="soyisim">Soyisim</label>
            </div>
          </div>

          <div className="input-wrapper">
            <i className="fa-regular fa-envelope"></i>
            <input type="email" id="email" placeholder=" " value={formData.email} onChange={handleInputChange} />
            <label htmlFor="email">Email</label>
          </div>

          <div className="input-wrapper">
            <i className="fa-solid fa-phone"></i>
            <input ref={phoneRef} id="telefon" type="tel" placeholder=" " />
            <label htmlFor="telefon">Telefon</label>
          </div>

          <div className="input-wrapper">
            <input type="text" id="glu" placeholder=" " className="no-icon" value={formData.glu} onChange={handleInputChange} />
            <label htmlFor="glu" className="no-icon-label">GLU Numarası</label>
          </div>

          <div className="input-group-row">
            <div className="input-wrapper">
              <i className="fa-solid fa-lock"></i>
              <input type="password" id="sifre" placeholder=" " value={formData.sifre} onChange={handleInputChange} />
              <label htmlFor="sifre">Şifre</label>
              <i className="fa-regular fa-eye-slash password-toggle"></i>
            </div>
            <div className="input-wrapper">
              <i className="fa-solid fa-lock"></i>
              <input type="password" id="tekrarSifre" placeholder=" " value={formData.tekrarSifre} onChange={handleInputChange} />
              <label htmlFor="tekrar-sifre">Tekrar Şifre</label>
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            Kayıt
          </button>
        </form>

        <div className="bottom-buttons-container">
          <button type="button" className="btn btn-secondary">
            Geri Dön
          </button>
          <a href="./login"><button type="button" className="btn btn-secondary">
            Giriş Yap
          </button></a>
          
        </div>
      </div>

      <div className="image-panel">
        <img src="/Register.png" alt="Eczane İllüstrasyonu" />
      </div>

      {/* SVG kısmı aynı kalıyor */}
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