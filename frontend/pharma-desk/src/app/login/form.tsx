"use client";

import "./form.css";
import { useState } from "react";

export default function Form() {
  const [formData, setFormData] = useState({
    email: "",
    sifre: "",
  });

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

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

          <a href="./register" className="forgot-password">
            Şifremi Unuttum
          </a>

          <div className="action-buttons-container">
            <button type="button" className="btn btn-primary">
              Giriş
            </button>
            <button type="button" className="btn btn-primary">
              Kayıt
            </button>
          </div>
        </form>
      </div>

      <div className="image-panel">
        <img src="/Login.png" alt="Eczane İllüstrasyonu" />
      </div>
    </div>
  );
}