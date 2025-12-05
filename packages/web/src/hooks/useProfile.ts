import { useState, useEffect } from 'react';
import { useAuth } from '../store/AuthContext';
import { PharmacyProfileData } from '../lib/dashboardData';
import { userService } from '../services/userService';

// Backend API response type (UserMeResponse from backend)
interface ApiUserResponse {
  id: string;
  gln?: string; // Backend uses 'GLN' or 'gln' 
  email?: string;
  pharmacyName?: string;
  publicId?: string;
  phoneNumber?: string;
  city?: string;
  district?: string;
  address1?: string;
  address2?: string;
  postalCode?: string;
  servicePackage?: string;
  role?: string;
  profileImagePath?: string;
  pharmacistFirstName?: string; // Eczacı Adı
  pharmacistLastName?: string;  // Eczacı Soyadı
  createdAt?: string;
  about?: string;
}

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
        const data = await userService.getProfile(token, userId) as unknown as ApiUserResponse;

        console.log('API Response data:', data);

        // Build full name from pharmacist first and last name
        const pharmacistFullName = [data.pharmacistFirstName, data.pharmacistLastName]
          .filter(Boolean)
          .join(' ')
          .trim();

        // Format registration date from createdAt
        const registrationDate = data.createdAt 
          ? new Date(data.createdAt).toLocaleDateString('tr-TR') 
          : 'Tarih Yok';

        // Map API response to PharmacyProfileData interface
        const mappedProfile: PharmacyProfileData = {
            id: String(data.id),
            pharmacyName: data.pharmacyName || "",
            gln: data.gln || "", // Backend returns 'gln' (camelCase from JSON)
            location: `${data.city || ''} / ${data.district || ''}`,
            address: data.address1 || "", // Backend uses address1
            city: data.city || "",
            district: data.district || "",
            registrationDate: registrationDate,
            about: data.about || "Eczane hakkında bilgi...",
            username: username === 'me' ? (data.email || username) : username,
            pharmacistInCharge: pharmacistFullName || "Eczacı Bilgisi Yok",
            logoUrl: data.profileImagePath || null,
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
        
        console.log('Mapped Profile:', mappedProfile);
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
