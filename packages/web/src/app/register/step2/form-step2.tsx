'use client';

import { useState, useMemo, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './form-step2.css';

// YENİ: Şehir, ilçe ve grup verilerini içeren daha kapsamlı veri yapısı
const cityData: { [key: string]: { districts: string[]; groups: string[] } } = {
  'Ankara': {
    districts: ['Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak', 'Etimesgut'],
    groups: ['Ankara Grubu', 'Başkent Eczacıları', 'Anadolu Grubu'],
  },
  'İstanbul': {
    districts: ['Kadıköy', 'Beşiktaş', 'Şişli', 'Fatih', 'Üsküdar'],
    groups: ['İstanbul Grubu', 'Marmara Eczacıları', 'Avrasya Grubu'],
  },
  'İzmir': {
    districts: ['Konak', 'Bornova', 'Karşıyaka', 'Buca', 'Çiğli'],
    groups: ['İzmir Grubu', 'Ege Eczacıları', 'Körfez Grubu'],
  },
};

const cities = Object.keys(cityData);

export default function FormStep2() {
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Sayfa yüklendiğinde veriyi kontrol et
    if (typeof window !== 'undefined') {
        const data = sessionStorage.getItem('registerStep1');
        if (!data) {
            // Veri yoksa başa dön
            router.push('/register');
        }
    }
  }, [router]);

  // Seçilen şehre göre ilçe ve grup seçeneklerini belirle
  const districtOptions = useMemo(() => {
    return selectedCity ? cityData[selectedCity]?.districts || [] : [];
  }, [selectedCity]);

  const groupOptions = useMemo(() => {
    return selectedCity ? cityData[selectedCity]?.groups || [] : [];
  }, [selectedCity]);

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value);
    setSelectedDistrict(''); // Şehir değiştiğinde ilçe seçimini sıfırla
    setSelectedGroup(''); // Şehir değiştiğinde grup seçimini sıfırla
  };

  const handleCompleteRegistration = async (e?: FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    console.log("handleCompleteRegistration triggered via", e?.type); // DEBUG LOG
    setErrorMessage("");
    
    if (!selectedCity || !selectedDistrict || !fullAddress || !selectedGroup) {
      console.log("Validation failed: Fields missing"); // DEBUG LOG
      setErrorMessage('Lütfen tüm alanları doldurunuz.');
      return;
    }

    setLoading(true);
    console.log("Loading set to true. Starting fetch..."); // DEBUG LOG

    try {
        const step1DataString = sessionStorage.getItem('registerStep1');
        if(!step1DataString) {
            console.error("Session data missing"); // DEBUG LOG
            setErrorMessage('Kayıt verileri bulunamadı. Lütfen en baştan başlayınız.');
            setTimeout(() => router.push('/register'), 2000);
            return;
        }
        
        const step1Data = JSON.parse(step1DataString);
        
        const finalPayload = {
            ...step1Data,
            City: selectedCity,
            District: selectedDistrict,
            Address: fullAddress,
            Group: selectedGroup
        };

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
        console.log(`Fetching to: ${apiUrl}/api/auth/register`); // DEBUG LOG
        
        const res = await fetch(`${apiUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalPayload)
        });

        console.log("Response status:", res.status); // DEBUG LOG

        const data = await res.json();
        console.log("Response data:", data); // DEBUG LOG

        if (res.ok) {
            console.log("Registration success"); // DEBUG LOG
            sessionStorage.removeItem('registerStep1');
            router.push('/login?success=true');
        } else {
            console.error("Registration failed:", data.error); // DEBUG LOG
            setErrorMessage(data.error || 'Kayıt işlemi başarısız oldu.');
        }

    } catch (error: any) {
        console.error("Register Error Exception:", error); // DEBUG LOG
        setErrorMessage('Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyiniz.');
    } finally {
        setLoading(false);
        console.log("Loading set to false"); // DEBUG LOG
    }
  };

  return (
    <div className="step2-container">
      <div className="step2-panel">
        <h1>Adres Ve Grup Bilgileri</h1>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="input-wrapper-step2">
            <label htmlFor="city">Şehir</label>
            <select id="city" value={selectedCity} onChange={handleCityChange} required>
              <option value="" disabled>Şehir seçiniz...</option>
              {cities.map(city => <option key={city} value={city}>{city}</option>)}
            </select>
          </div>

          {/* YENİ: İlçe Seçim Alanı */}
          <div className="input-wrapper-step2">
            <label htmlFor="district">İlçe</label>
            <select
              id="district"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              required
              disabled={!selectedCity}
            >
              <option value="" disabled>
                {selectedCity ? 'İlçe seçiniz...' : 'Önce şehir seçiniz'}
              </option>
              {districtOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>

          {/* YENİ: Açık Adres Alanı */}
          <div className="input-wrapper-step2">
            <label htmlFor="address">Açık Adres</label>
            <textarea
              id="address"
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
              placeholder="Mahalle, cadde, sokak ve kapı no belirtiniz..."
              required
            />
          </div>

          <div className="input-wrapper-step2">
            <label htmlFor="group">Grup</label>
            <select id="group" value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} required disabled={!selectedCity}>
              <option value="" disabled>{selectedCity ? 'Grup seçiniz...' : 'Önce şehir seçiniz'}</option>
              {groupOptions.map(group => <option key={group} value={group}>{group}</option>)}
            </select>
          </div>

          {errorMessage && (
            <div style={{ color: 'red', marginBottom: '10px', textAlign: 'center', fontSize: '14px' }}>
                {errorMessage}
            </div>
          )}

          <div className="action-buttons-container-step2">
            <button 
                type="button" 
                className="btn-step2 btn-primary-step2" 
                disabled={loading}
                onClick={handleCompleteRegistration}
            >
              {loading ? 'İşleniyor...' : 'Kaydı Tamamla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}