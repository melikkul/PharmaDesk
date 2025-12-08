'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { carrierApi, CarrierRegisterRequest } from '@/services/carrierApi';

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tokenParam = searchParams.get('token');

    const [token, setToken] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [vehicleInfo, setVehicleInfo] = useState('');

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);

    useEffect(() => {
        if (tokenParam) {
            setToken(tokenParam);
            validateToken(tokenParam);
        } else {
            setIsValidating(false);
            setError('Kayıt token\'ı bulunamadı. Lütfen geçerli bir kayıt linki kullanın.');
        }
    }, [tokenParam]);

    const validateToken = async (tokenValue: string) => {
        setIsValidating(true);
        try {
            const response = await carrierApi.validateToken(tokenValue);
            setEmail(response.email);
            setTokenValid(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Token geçersiz veya süresi dolmuş.');
            setTokenValid(false);
        } finally {
            setIsValidating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Şifreler eşleşmiyor.');
            return;
        }

        if (password.length < 6) {
            setError('Şifre en az 6 karakter olmalıdır.');
            return;
        }

        setIsLoading(true);

        try {
            const registerData: CarrierRegisterRequest = {
                token,
                email,
                password,
                firstName,
                lastName,
                phoneNumber: phoneNumber || undefined,
                companyName: companyName || undefined,
                vehicleInfo: vehicleInfo || undefined,
            };

            await carrierApi.register(registerData);

            // Success - redirect to login
            alert('Kayıt başarılı! Giriş yapabilirsiniz.');
            router.push('/login');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Kayıt başarısız. Lütfen tekrar deneyin.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isValidating) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
                    <p className="mt-4 text-lg">Token doğrulanıyor...</p>
                </div>
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="card max-w-md text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Geçersiz Token</h2>
                    <p className="text-white/70 mb-6">{error}</p>
                    <button onClick={() => router.push('/login')} className="btn-primary">
                        Giriş Sayfasına Dön
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 py-12">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">Taşıyıcı Kaydı</h1>
                    <p className="text-white/70">Bilgilerinizi girerek kayıt olun</p>
                </div>

                <div className="card">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div className="bg-primary-500/20 border border-primary-500/50 px-4 py-3 rounded-lg">
                            <p className="text-sm text-white/90">
                                <strong>Email:</strong> {email}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-white/90 mb-1">
                                    İsim *
                                </label>
                                <input
                                    id="firstName"
                                    type="text"
                                    required
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="input-field"
                                    placeholder="Adınız"
                                />
                            </div>

                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-white/90 mb-1">
                                    Soyisim *
                                </label>
                                <input
                                    id="lastName"
                                    type="text"
                                    required
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="input-field"
                                    placeholder="Soyadınız"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="phoneNumber" className="block text-sm font-medium text-white/90 mb-1">
                                Telefon
                            </label>
                            <input
                                id="phoneNumber"
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="input-field"
                                placeholder="+90 555 123 4567"
                            />
                        </div>

                        <div>
                            <label htmlFor="companyName" className="block text-sm font-medium text-white/90 mb-1">
                                Şirket Adı
                            </label>
                            <input
                                id="companyName"
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="input-field"
                                placeholder="Kargo Şirketi A.Ş."
                            />
                        </div>

                        <div>
                            <label htmlFor="vehicleInfo" className="block text-sm font-medium text-white/90 mb-1">
                                Araç Bilgisi
                            </label>
                            <input
                                id="vehicleInfo"
                                type="text"
                                value={vehicleInfo}
                                onChange={(e) => setVehicleInfo(e.target.value)}
                                className="input-field"
                                placeholder="34 ABC 123 - Ford Transit"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-1">
                                Şifre *
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field"
                                placeholder="En az 6 karakter"
                                minLength={6}
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/90 mb-1">
                                Şifre Tekrar *
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="input-field"
                                placeholder="Şifrenizi tekrar girin"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
            </div>
        }>
            <RegisterForm />
        </Suspense>
    );
}
