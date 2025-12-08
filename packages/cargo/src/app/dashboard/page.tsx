'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCarrierAuth } from '@/context/CarrierAuthContext';
import Link from 'next/link';

export default function DashboardPage() {
    const { user, isLoading, logout } = useCarrierAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8">
            {/* Header */}
            <div className="max-w-4xl mx-auto mb-8">
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-1">
                                Hoş geldin, {user.firstName}!
                            </h1>
                            <p className="text-white/70 text-sm">{user.email}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="btn-secondary text-sm px-4 py-2"
                        >
                            Çıkış
                        </button>
                    </div>
                </div>
            </div>

            {/* Profile Info */}
            <div className="max-w-4xl mx-auto mb-6">
                <div className="card">
                    <h2 className="text-xl font-bold text-white mb-4">Profil Bilgileri</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-white/60 mb-1">İsim Soyisim</p>
                            <p className="text-white font-medium">{user.firstName} {user.lastName}</p>
                        </div>
                        <div>
                            <p className="text-white/60 mb-1">Email</p>
                            <p className="text-white font-medium">{user.email}</p>
                        </div>
                        {user.phoneNumber && (
                            <div>
                                <p className="text-white/60 mb-1">Telefon</p>
                                <p className="text-white font-medium">{user.phoneNumber}</p>
                            </div>
                        )}
                        {user.companyName && (
                            <div>
                                <p className="text-white/60 mb-1">Şirket</p>
                                <p className="text-white font-medium">{user.companyName}</p>
                            </div>
                        )}
                        {user.vehicleInfo && (
                            <div>
                                <p className="text-white/60 mb-1">Araç Bilgisi</p>
                                <p className="text-white font-medium">{user.vehicleInfo}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-white/60 mb-1">Durum</p>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${user.status === 'Active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                                }`}>
                                {user.status === 'Active' ? 'Aktif' : 'Askıda'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* QR Scanner Button */}
            <div className="max-w-4xl mx-auto">
                <Link href="/scan">
                    <div className="card hover:bg-white/15 transition-all cursor-pointer group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">QR Kod Okut</h3>
                                    <p className="text-white/70 text-sm">İlaç üzerindeki karekodu tarat</p>
                                </div>
                            </div>
                            <svg className="w-6 h-6 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Info Note */}
            <div className="max-w-4xl mx-auto mt-6">
                <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                        <svg className="w-6 h-6 text-primary-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                            <p className="text-white/90 text-sm">
                                <strong>Not:</strong> QR kod okuma özelliği şu anda sadece kullanıcı arayüzü olarak hazırlanmıştır.
                                QR kod doğrulama ve işleme mantığı backend sistemi tamamlandıktan sonra eklenecektir.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
