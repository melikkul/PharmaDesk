import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PharmacyProfileData } from '../data/dashboardData';

export const useProfile = (username: string) => {
  const [profile, setProfile] = useState<PharmacyProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) return;
      
      // If username is 'me', we might want to use the 'me' endpoint or just rely on AuthContext.
      // But for consistency, let's fetch from API if possible, or handle 'me' logic here.
      // The API endpoint we added is /api/users/{username}.
      
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        // If username is 'me', use /api/users/me, otherwise /api/users/{username}
        // Actually, our UsersController has Me() at /api/users/me and GetProfile(username) at /api/users/{username}.
        // If username is 'me', it will hit GetProfile('me') unless we handle it. 
        // UsersController route order matters. "me" is a specific literal, "{username}" is a parameter.
        // Usually specific routes take precedence. Let's assume "me" hits Me().
        
        const endpoint = username === 'me' ? `${apiUrl}/api/users/me` : `${apiUrl}/api/users/${username}`;

        const response = await fetch(endpoint, {
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
                registrationDate: new Date(data.createdAt).toLocaleDateString('tr-TR'),
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
                kayitTarihi: data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
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
