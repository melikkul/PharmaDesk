"use client";

import "./form.css";
import Register from "../../../public/Login.png";
import { useIMask } from "react-imask";
// ### OPTİMİZASYON: 'useCallback' ve 'useEffect' import edildi ###
import { useState, useCallback, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { text } from "stream/consumers";

export default function Form() {
  const [formData, setFormData] = useState({
    isim: "",
    soyisim: "",
    email: "",
    gln: "", // GLU yerine GLN
    sifre: "",
    tekrarSifre: "",
  });
  const router = useRouter();

  // // Sayfa yüklendiğinde doğrudan /anasayfa'ya yönlendir
  // useEffect(() => {
  //   // Bu sayfa doğrudan açıldığında /anasayfa'ya yönlendirir.
  //   // Eğer kayıt formunun gösterilmesi gerekiyorsa bu satırı kaldırın.
  //   router.replace('/anasayfa');
  // }, [router]);

  // ### OPTİMİZASYON: useCallback ###
  // Form input fonksiyonu memoize edildi.
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    
    // 'setFormData'nın callback formunu kullanarak 'formData' bağımlılığından kurtulduk.
    if (id === 'isim' || id === 'soyisim') {
      const filteredValue = value.replace(/[^a-zA-ZçÇğĞıİöÖşŞüÜ\s]/g, ''); // Sadece harf ve boşluk
      setFormData(prev => ({ ...prev, [id]: filteredValue }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  }, []); // Bağımlılığı yok

  const { ref: phoneRef, value: phoneValue } = useIMask<HTMLInputElement>({
    mask: '(\\0\\500) 000 00 00',
    lazy: false,
  });

  // YENİ: GLN Numarası için IMask
  const { ref: glnRef, value: glnValue } = useIMask<HTMLInputElement>({
    mask: '0000000000000', // 13 haneli GLN formatı
    lazy: true, // DEĞİŞİKLİK: Placeholder'ları gizlemek için lazy: true yapıldı
    overwrite: true,
  });

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault(); // Sayfanın yeniden yüklenmesini engelle

    // Basit validasyon
    if (!formData.isim || !formData.soyisim || !formData.email || !glnValue || !formData.sifre || !formData.tekrarSifre) {
      alert("Lütfen tüm alanları doldurunuz.");
      return;
    }
    // YENİ: GLN formatı kontrolü
    if (glnValue.replace(/[^0-9]/g, '').length !== 13) {
      alert("Lütfen tüm alanları doldurunuz.");
      return;
    }

    if (formData.sifre !== formData.tekrarSifre) {
      alert("Şifreler uyuşmuyor.");
      return;
    }

    // Burada form verilerini bir API'ye gönderme veya başka bir işlem yapabilirsiniz.
    console.log("Form Verileri:", {
      ...formData,
      telefon: phoneValue, // Maskelenmiş telefon numarasını ekle
      gln: glnValue, // Maskelenmiş GLN numarasını ekle
    });

    // TODO: API çağrısı burada yapılmalı
    // Başarılı olursa ikinci adıma yönlendir
    router.push('/register/step2');
  }, [formData, router, phoneValue, glnValue]); // formData, router, phoneValue ve glnValue bağımlılıklarını ekledik

  return (
    <div className="container">
      {/* --- DEĞİŞTİRİLEN SATIR --- */}
      <div className="form-panel" onDrop={(e) => e.preventDefault()} onDragOver={(e) => e.preventDefault()}>
        <h1>Kayıt Ekranı</h1>
        <form onSubmit={handleSubmit}>
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
            <input ref={glnRef} type="text" id="gln" placeholder=" " className="no-icon" onChange={handleInputChange} />
            <label htmlFor="gln" className="no-icon-label">GLN Numarası</label>
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
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
            Geri Dön
          </button>
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