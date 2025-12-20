'use client';

import { useState, useMemo, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import './form-step2.css';

interface City {
  id: number;
  name: string;
  plateCode: string | null;
}

interface District {
  id: number;
  name: string;
}

interface Group {
  id: number;
  name: string;
  description: string | null;
}

export default function FormStep2() {
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  const [fullAddress, setFullAddress] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fetchingDistricts, setFetchingDistricts] = useState(false);
  const [fetchingGroups, setFetchingGroups] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    // Check Step 1 data exists
    if (typeof window !== 'undefined') {
      const data = sessionStorage.getItem('registerStep1');
      if (!data) {
        router.push('/register');
      }
    }
    
    // Fetch cities on mount
    fetchCities();
  }, [router]);

  const fetchCities = async () => {
    try {
      const apiUrl = '';
      const res = await fetch(`${apiUrl}/api/locations/cities`);
      
      if (res.ok) {
        const data = await res.json();
        setCities(data);
      } else {
        setErrorMessage('İller yüklenemedi');
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      setErrorMessage('Sunucuya bağlanılamadı');
    }
  };

  const handleCityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cityId = Number(e.target.value);
    setSelectedCityId(cityId);
    setSelectedDistrictId(null);
    setSelectedGroupId(null);
    setDistricts([]);
    setGroups([]);
    setErrorMessage('');

    if (!cityId) return;

    // Fetch districts
    setFetchingDistricts(true);
    try {
      const apiUrl = '';
      const res = await fetch(`${apiUrl}/api/locations/districts/${cityId}`);
      
      if (res.ok) {
        const data = await res.json();
        setDistricts(data);
      } else {
        setErrorMessage('İlçeler yüklenemedi');
      }
    } catch (error) {
      console.error('Error fetching districts:', error);
      setErrorMessage('İlçeler yüklenirken hata oluştu');
    } finally {
      setFetchingDistricts(false);
    }

    // Fetch groups
    setFetchingGroups(true);
    try {
      const apiUrl = '';
      const res = await fetch(`${apiUrl}/api/groups/by-city/${cityId}`);
      
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      } else {
        setErrorMessage('Gruplar yüklenemedi');
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      setErrorMessage('Gruplar yüklenirken hata oluştu');
    } finally {
      setFetchingGroups(false);
    }
  };

  const handleCompleteRegistration = async (e?: FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    
    if (!selectedCityId || !selectedDistrictId || !fullAddress) {
      setErrorMessage('Lütfen il, ilçe ve adres alanlarını doldurunuz.');
      return;
    }

    if (!selectedGroupId) {
      setErrorMessage('Lütfen bir grup seçiniz. Gruba katılım zorunludur.');
      return;
    }

    setLoading(true);

    try {
      const step1DataString = sessionStorage.getItem('registerStep1');
      if(!step1DataString) {
        setErrorMessage('Kayıt verileri bulunamadı. Lütfen en baştan başlayınız.');
        setTimeout(() => router.push('/register'), 2000);
        return;
      }
      
      const step1Data = JSON.parse(step1DataString);
      
      // Find city and district names
      const selectedCity = cities.find(c => c.id === selectedCityId);
      const selectedDistrict = districts.find(d => d.id === selectedDistrictId);
      
      const finalPayload = {
        ...step1Data,
        City: selectedCity?.name || '',
        District: selectedDistrict?.name || '',
        Address: fullAddress,
        GroupId: selectedGroupId // Can be null if no group selected
      };

      const res = await fetch(`/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload)
      });

      const data = await res.json();

      if (res.ok) {
        sessionStorage.removeItem('registerStep1');
        // Show success toast before redirect
        toast.success('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...', {
          duration: 2000,
        });
        // Wait for toast to be visible then redirect
        setTimeout(() => {
          router.push('/login?success=true');
        }, 1500);
      } else {
        setErrorMessage(data.error || 'Kayıt işlemi başarısız oldu.');
      }

    } catch (error: any) {
      console.error("Register Error:", error);
      setErrorMessage('Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyiniz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="step2-container">
      <div className="step2-panel">
        <h1>Adres Ve Grup Bilgileri</h1>
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="input-wrapper-step2">
            <label htmlFor="city">Şehir</label>
            <select 
              id="city" 
              value={selectedCityId || ''} 
              onChange={handleCityChange} 
              required
            >
              <option value="">Şehir seçiniz...</option>
              {cities.map(city => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          <div className="input-wrapper-step2">
            <label htmlFor="district">İlçe</label>
            <select
              id="district"
              value={selectedDistrictId || ''}
              onChange={(e) => setSelectedDistrictId(Number(e.target.value))}
              required
              disabled={!selectedCityId || fetchingDistricts}
            >
              <option value="">
                {fetchingDistricts ? 'Yükleniyor...' : selectedCityId ? 'İlçe seçiniz...' : 'Önce şehir seçiniz'}
              </option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>

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
            <label htmlFor="group">Grup <span style={{ color: '#e74c3c' }}>*</span></label>
            <select 
              id="group" 
              value={selectedGroupId || ''} 
              onChange={(e) => setSelectedGroupId(Number(e.target.value) || null)} 
              disabled={!selectedCityId || fetchingGroups}
              required
            >
              <option value="">
                {fetchingGroups ? 'Yükleniyor...' : selectedCityId ? 'Grup seçiniz (zorunlu)' : 'Önce şehir seçiniz'}
              </option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            {selectedCityId && groups.length === 0 && !fetchingGroups && (
              <small style={{ color: '#e74c3c', fontSize: '0.875rem', marginTop: '0.25rem', display: 'block' }}>
                ⚠️ Bu ilde henüz aktif grup bulunmamaktadır. Kayıt için lütfen yöneticinize başvurunuz.
              </small>
            )}
            {groups.length > 0 && (
              <small style={{ color: '#27ae60', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                ✓ Gruba katılım zorunludur
              </small>
            )}
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
    </>
  );
}