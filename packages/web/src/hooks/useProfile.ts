import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PharmacyProfileData } from '../data/dashboardData';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

export const useProfile = (username: string) => {
  console.log('useProfile called with:', username);
  const [profile, setProfile] = useState<PharmacyProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();
  console.log('useProfile token:', token);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;
      
      try {
        const endpoint = username === 'me' ? `/api/users/me` : `/api/users/${username}`;

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            setProfile(null); // Not found
          } else {
            throw new Error('Failed to fetch profile');
          }
        } else {
            const data = await response.json();
            // Map API response to PharmacyProfileData interface if needed
            // API returns UserMeResponse (PascalCase). Frontend expects camelCase usually?
            // Let's assume we need to map it.
            
            const mappedProfile: PharmacyProfileData = {
                id: data.id,
                pharmacyName: data.pharmacyName,
                gln: data.gln,
                location: `${data.city || ''} / ${data.district || ''}`,
                registrationDate: data.createdAt ? new Date(data.createdAt).toLocaleDateString('tr-TR') : 'Tarih Yok',
                about: "Eczane hakkında bilgi...", // API doesn't have 'about' yet
                username: username === 'me' ? data.email : username, // Fallback
                pharmacistInCharge: "Eczacı Adı", // Placeholder
                logoUrl: data.profileImagePath,
                // Default values for missing fields
                balance: 0,
                coverImageUrl: null,
                phone: data.phoneNumber || "",
                grupYuku: 0,
                alimSayisi: 0,
                alimTutari: 0,
                sistemKazanci: 0,
                teklifSayisi: 0,
                gonderiAdet: 0,
                gonderiTutari: 0,
                grubaKazandirdigi: 0,
                kayitTarihi: data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : '2024-01-01'
            };
            setProfile(mappedProfile);
        }
      } catch (err) {
        console.error(err);
        setError('Profil yüklenirken hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchProfile();
    }
  }, [username, token]);

  return { profile, loading, error };
};
