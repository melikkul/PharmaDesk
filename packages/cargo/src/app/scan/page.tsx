'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCarrierAuth } from '@/context/CarrierAuthContext';

export default function ScanPage() {
    const { user, isLoading } = useCarrierAuth();
    const router = useRouter();
    const [scanning, setScanning] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [scanResult, setScanResult] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    const handleStartScan = () => {
        setScanning(true);
        setScanResult(null);
        // Simulated scan after 2 seconds (placeholder)
        setTimeout(() => {
            setScanResult('QR_CODE_PLACEHOLDER_12345');
            setScanning(false);
        }, 2000);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode.trim()) {
            setScanResult(manualCode);
            setManualCode('');
        }
    };

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4">
            {/* Header */}
            <div className="max-w-2xl mx-auto mb-6">
                <button
                    onClick={() => router.push('/dashboard')}
                    className="btn-secondary text-sm px-4 py-2 mb-4"
                >
                    ← Geri Dön
                </button>

                <h1 className="text-3xl font-bold text-white mb-2">QR Kod Okuyucu</h1>
                <p className="text-white/70">İlaç üzerindeki karekodu okutun</p>
            </div>

            {/* Scanner Area */}
            <div className="max-w-2xl mx-auto mb-6">
                <div className="card">
                    {!scanning && !scanResult && (
                        <div className="text-center py-12">
                            <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-primary-400/20 to-primary-600/20 rounded-3xl flex items-center justify-center border-2 border-dashed border-primary-500/50">
                                <svg className="w-20 h-20 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">QR Kod Tarama</h3>
                            <p className="text-white/70 mb-6">Taramaya başlamak için butona tıklayın</p>
                            <button
                                onClick={handleStartScan}
                                className="btn-primary"
                            >
                                <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Taramaya Başla
                            </button>
                        </div>
                    )}

                    {scanning && (
                        <div className="text-center py-12">
                            <div className="relative w-64 h-64 mx-auto mb-6">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-primary-600/20 rounded-2xl"></div>
                                <div className="scan-frame"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <svg className="w-32 h-32 text-primary-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Taranıyor...</h3>
                            <p className="text-white/70">QR kodu kameraya gösterin</p>
                        </div>
                    )}

                    {scanResult && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Tarama Başarılı!</h3>
                            <div className="glass p-4 rounded-lg mb-6 max-w-md mx-auto">
                                <p className="text-sm text-white/60 mb-1">QR Kod:</p>
                                <p className="text-white font-mono text-lg break-all">{scanResult}</p>
                            </div>
                            <p className="text-white/70 text-sm mb-6">
                                <strong>Not:</strong> QR kod doğrulama ve işleme sistemi backend tamamlandığında eklenecektir.
                            </p>
                            <button
                                onClick={() => {
                                    setScanResult(null);
                                    handleStartScan();
                                }}
                                className="btn-primary"
                            >
                                Tekrar Tara
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Manual Entry */}
            <div className="max-w-2xl mx-auto">
                <div className="card">
                    <h3 className="text-lg font-bold text-white mb-4">Manuel Kod Girişi</h3>
                    <form onSubmit={handleManualSubmit} className="space-y-4">
                        <input
                            type="text"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            className="input-field"
                            placeholder="QR kod numarasını girin"
                        />
                        <button type="submit" className="btn-secondary w-full">
                            Kodu Doğrula
                        </button>
                    </form>
                </div>
            </div>

            {/* Info */}
            <div className="max-w-2xl mx-auto mt-6">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                        <svg className="w-6 h-6 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="text-white/90 text-sm">
                                <strong>Geliştirme Notu:</strong> Bu sayfa şu anda sadece UI gösterimi içindir.
                                Gerçek QR kod okuma ve backend entegrasyonu sipariş sistemi tamamlandığında eklenecektir.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
