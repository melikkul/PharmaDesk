'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCarrierAuth } from '@/context/CarrierAuthContext';

export default function HomePage() {
    const { user, isLoading } = useCarrierAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (user) {
                router.replace('/dashboard');
            } else {
                router.replace('/login');
            }
        }
    }, [user, isLoading, router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
                <p className="mt-4 text-lg">Yükleniyor...</p>
            </div>
        </div>
    );
}
