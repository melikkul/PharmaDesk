import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { PharmacyProfileData } from '../lib/dashboardData';
import { userService } from '../services/userService';
import { PharmacyProfile } from '../types';

export const useProfile = (username: string) => {
  console.log('useProfile called with:', username);
  const [profile, setProfile] = useState<PharmacyProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();
  console.log('useProfile token:', token);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username || !token) return;
      
      try {
        // Handle "me" or specific user ID/username logic in service or here
        // The service handles /me if userId is not provided.
        // If username is 'me', we pass undefined to getProfile(token).
        // If username is actual username/id, we pass it.
        
        const userId = username === 'me' ? undefined : username;
        const data: PharmacyProfile = await userService.getProfile(token, userId);

        // Map API response to PharmacyProfileData interface
        const mappedProfile: PharmacyProfileData = {
            id: String(data.id),
            pharmacyName: data.pharmacyName,
            gln: data.glnNumber,
            location: `${data.city || ''} / ${data.district || ''}`,
            address: data.address || "",
            city: data.city || "",
            district: data.district || "",
            registrationDate: data.joinDate ? new Date(data.joinDate).toLocaleDateString('tr-TR') : 'Tarih Yok',
            about: data.about || "Eczane hakkında bilgi...",
            username: username === 'me' ? data.email : username,
            pharmacistInCharge: data.fullName || "Eczacı Bilgisi Yok",
            logoUrl: null, // data.profileImagePath not in interface
            balance: 0,
            coverImageUrl: null,
            phone: data.phone || "",
            grupYuku: 0,
            alimSayisi: 0,
            alimTutari: 0,
            sistemKazanci: 0,
            teklifSayisi: 0,
            gonderiAdet: 0,
            gonderiTutari: 0,
            grubaKazandirdigi: 0,
            kayitTarihi: data.joinDate ? new Date(data.joinDate).toISOString().split('T')[0] : '2024-01-01'
        };
        setProfile(mappedProfile);
      } catch (err) {
        console.error(err);
        setError('Profil yüklenirken hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username, token]);

  return { profile, loading, error };
};
