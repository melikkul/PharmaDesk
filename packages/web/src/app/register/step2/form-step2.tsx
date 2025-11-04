// packages/web/src/app/(auth)/register/step2/form-step2.tsx
'use client';

import { useState, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './form-step2.css';

// Şehir ve grup verilerini simüle edelim
const cityGroupData: { [key: string]: string[] } = {
  'Ankara': ['Ankara Grubu', 'Başkent Eczacıları', 'Anadolu Grubu'],
  'İstanbul': ['İstanbul Grubu', 'Marmara Eczacıları', 'Avrasya Grubu'],
  'İzmir': ['İzmir Grubu', 'Ege Eczacıları', 'Körfez Grubu'],
};

const cities = Object.keys(cityGroupData);

export default function FormStep2() {
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const router = useRouter();

  // Seçilen şehre göre grup seçeneklerini belirle
  const groupOptions = useMemo(() => {
    return selectedCity ? cityGroupData[selectedCity] : [];
  }, [selectedCity]);

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value);
    setSelectedGroup(''); // Şehir değiştiğinde grup seçimini sıfırla
  };

  const handleCompleteRegistration = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCity || !selectedGroup) {
      alert('Lütfen şehir ve grup seçimi yapınız.');
      return;
    }

    // Backend'e son kayıt verilerini gönderme simülasyonu
    console.log('Kayıt Tamamlandı:', {
      city: selectedCity,
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
            <button type="submit" className="btn-step2 btn-primary-step2">
              Kaydı Tamamla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}