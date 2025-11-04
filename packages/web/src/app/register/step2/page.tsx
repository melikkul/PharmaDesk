// packages/web/src/app/register/step2/page.tsx
'use client';

import { useState, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './form-step2.css'; // CSS dosyasının doğru yolu

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

export default function RegisterStep2Page() {
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(''); // YENİ: İlçe state'i
  const [fullAddress, setFullAddress] = useState<string>(''); // YENİ: Açık adres state'i
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const router = useRouter();

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

  const handleCompleteRegistration = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCity || !selectedDistrict || !fullAddress || !selectedGroup) {
      alert('Lütfen şehir ve grup seçimi yapınız.');
      return;
    }

    // Backend'e son kayıt verilerini gönderme simülasyonu
    console.log('Kayıt Tamamlandı:', {
      city: selectedCity,
      district: selectedDistrict,
      address: fullAddress,
      group: selectedGroup,
    });

    alert('Kaydınız başarıyla tamamlandı! Giriş sayfasına yönlendiriliyorsunuz.');
    router.push('/login');
  };

  return (
    <div className="step2-container">
      <div className="step2-panel">
        <h1>Adres Ve Grup Bilgileri</h1>
        <form onSubmit={handleCompleteRegistration}>
          <div className="input-wrapper-step2">
            <label htmlFor="city">Şehir</label>
            <select
              id="city"
              value={selectedCity}
              onChange={handleCityChange}
              required
            >
              <option value="" disabled>
                Şehir seçiniz...
              </option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
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
              disabled={!selectedCity} // Şehir seçilmeden ilçe seçilemez
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
            <select
              id="group"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              required
              disabled={!selectedCity} // Şehir seçilmeden grup seçilemez
            >
              <option value="" disabled>
                {selectedCity ? 'Grup seçiniz...' : 'Önce şehir seçiniz'}
              </option>
              {groupOptions.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          <div className="action-buttons-container-step2">
            <a href="../dashboard" type="submit" className="btn-step2 btn-primary-step2">Kaydı Tamamla</a>
          </div>
        </form>
      </div>
    </div>
  );
}