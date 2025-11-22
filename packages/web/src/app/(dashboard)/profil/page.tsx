'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ProfilRedirectPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.username) {
      router.replace(`/profil/${user.username}`);
    } else {
      router.replace('/profil/me');
    }
  }, [user, router]);

  return <div className="p-10 text-center">Yönlendiriliyor...</div>;
}
