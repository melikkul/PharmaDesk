'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';

export default function ProfilRedirectPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // Always redirect to /profile/me for own profile
    router.replace('/profile/me');
  }, [router]);

  return <div className="p-10 text-center">Yönlendiriliyor...</div>;
}
