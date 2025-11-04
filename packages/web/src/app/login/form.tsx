"use client";

import "./form.css";
// ### OPTİMİZASYON: 'useCallback' import edildi ###
import { useState, useCallback } from "react";

export default function Form() {
  const [formData, setFormData] = useState({
    email: "",
    sifre: "",
  });

  // ### OPTİMİZASYON: useCallback ###
  // Form input fonksiyonu memoize edildi.
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    // 'setFormData'nın callback formunu kullanarak 'formData' bağımlılığından kurtulduk.
    setFormData(prev => ({ ...prev, [id]: value }));
  }, []); // Bağımlılığı yok

  return (
    <div className="container">
      <div className="form-panel">
        <h1>Giriş Ekranı</h1>
        <form action="#">
          <div className="input-wrapper">
            <i className="fa-regular fa-envelope"></i>
            <input
              type="email"
              id="email"
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

          <div className="action-buttons-container">
            <a href="./dashboard" type="button" className="btn btn-primary">
            Giriş
            </a>
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