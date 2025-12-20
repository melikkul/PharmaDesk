'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCarrierAuth } from '@/context/CarrierAuthContext';
import { carrierApi, ScanResult } from '@/services/carrierApi';
import { Html5Qrcode } from 'html5-qrcode';

type ScanState = 'idle' | 'initializing' | 'scanning' | 'processing' | 'success' | 'error';
type CameraPermission = 'prompt' | 'granted' | 'denied' | 'unavailable';

interface ScanHistoryItem {
    token: string;
    result: ScanResult;
    timestamp: Date;
}

// Separate component that uses useSearchParams
function ScanPageContent() {
    const { user, isLoading } = useCarrierAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Get scan mode from URL
    const scanMode = searchParams.get('mode') as 'pickup' | 'delivery' | null;
    const targetShipmentId = searchParams.get('shipmentId');
    
    // Scanner state
    const [scanState, setScanState] = useState<ScanState>('idle');
    const [cameraPermission, setCameraPermission] = useState<CameraPermission>('prompt');
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [manualCode, setManualCode] = useState('');
    const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showManualEntry, setShowManualEntry] = useState(false);
    
    // Debounce state - prevent duplicate scans
    const [lastScannedToken, setLastScannedToken] = useState<string | null>(null);
    const [isDebouncing, setIsDebouncing] = useState(false);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Camera scanner refs
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const isMountedRef = useRef(true);

    // Auth check
    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    // Check camera permission on mount
    useEffect(() => {
        checkCameraPermission();
    }, []);

    // Cleanup scanner on unmount
    useEffect(() => {
        isMountedRef.current = true;
        
        return () => {
            isMountedRef.current = false;
            
            // Safe cleanup
            if (scannerRef.current) {
                try {
                    scannerRef.current.stop().catch(() => {});
                } catch (e) {
                    // Ignore cleanup errors
                }
                scannerRef.current = null;
            }
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    // Check camera permission status - simplified to always show button
    const checkCameraPermission = async () => {
        // Don't check for API availability here - always show the camera button
        // If camera fails, user will see appropriate error message when they try
        // This ensures consistent UI across all browsers/contexts
        
        try {
            if (navigator.permissions) {
                try {
                    const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
                    // Only hide button if explicitly denied
                    if (result.state === 'denied') {
                        setCameraPermission('denied');
                        setShowManualEntry(true);
                    } else {
                        setCameraPermission(result.state as CameraPermission);
                    }
                } catch {
                    // Permission query not supported, default to prompt (button visible)
                    setCameraPermission('prompt');
                }
            } else {
                // No permissions API, default to prompt (button visible)
                setCameraPermission('prompt');
            }
        } catch (error) {
            console.error('Permission check error:', error);
            // Even on error, keep button visible
            setCameraPermission('prompt');
        }
    };

    // Debounce function - prevents same QR from being scanned within 2 seconds
    const shouldProcessToken = useCallback((token: string): boolean => {
        if (isDebouncing && token === lastScannedToken) {
            console.log('Debounce: Same token scanned within cooldown period');
            return false;
        }
        return true;
    }, [isDebouncing, lastScannedToken]);

    const startDebounce = useCallback((token: string) => {
        setLastScannedToken(token);
        setIsDebouncing(true);
        
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        
        debounceTimeoutRef.current = setTimeout(() => {
            setIsDebouncing(false);
            setLastScannedToken(null);
        }, 2000); // 2 second debounce
    }, []);

    // Safe stop camera function
    const safeStopCamera = useCallback(async () => {
        if (scannerRef.current) {
            try {
                const state = scannerRef.current.getState();
                if (state === 2) { // Html5QrcodeScannerState.SCANNING
                    await scannerRef.current.stop();
                }
            } catch (e) {
                console.warn('Camera stop warning (non-critical):', e);
            }
        }
        setIsCameraActive(false);
    }, []);

    // Process QR Code - API call
    const processQRCode = useCallback(async (token: string) => {
        // Debounce check
        if (!shouldProcessToken(token)) {
            return;
        }

        // Stop camera if active
        await safeStopCamera();

        setScanState('processing');
        setErrorMessage(null);
        startDebounce(token);

        try {
            const result = await carrierApi.scanShipment(token);
            
            if (!isMountedRef.current) return;
            
            setScanResult(result);
            setScanState(result.success ? 'success' : 'error');
            
            if (!result.success) {
                setErrorMessage(result.message);
            }

            // Add to history
            setScanHistory(prev => [{
                token: token.substring(0, 20) + '...',
                result,
                timestamp: new Date()
            }, ...prev.slice(0, 9)]); // Keep last 10

        } catch (error: any) {
            if (!isMountedRef.current) return;
            
            console.error('Scan error:', error);
            const errorResult: ScanResult = {
                success: false,
                message: error.response?.data?.message || error.message || 'Bağlantı hatası. Lütfen tekrar deneyin.',
                errorCode: error.response?.status || 500
            };
            setScanResult(errorResult);
            setScanState('error');
            setErrorMessage(errorResult.message);
        }
    }, [shouldProcessToken, startDebounce, safeStopCamera]);

    // Start camera scanning with enhanced error handling
    const startCameraScanning = useCallback(async () => {
        try {
            // First set state to show the qr-reader div
            setScanState('initializing');
            setErrorMessage(null);
            setScanResult(null);

            // Wait for DOM to render the qr-reader element
            await new Promise(resolve => setTimeout(resolve, 150));

            console.log('📷 Starting camera...');

            // Create scanner if not exists (after DOM is ready)
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode('qr-reader', { 
                    verbose: false,
                    experimentalFeatures: {
                        useBarCodeDetectorIfSupported: true // Use native BarcodeDetector API if available (faster)
                    }
                });
            }

            // Optimized camera config for faster scanning
            // Responsive settings for different mobile devices
            const screenWidth = window.innerWidth || 360;
            const qrboxSize = Math.min(250, screenWidth - 70); // Adaptive QR box size
            
            const cameraConfig = {
                fps: 15, // Balanced FPS (15 is good for most devices)
                qrbox: { width: qrboxSize, height: qrboxSize },
                aspectRatio: 1.0,
                disableFlip: false,
                // Flexible resolution - works on all devices
                videoConstraints: {
                    facingMode: 'environment',
                    // Use min/ideal/max for maximum compatibility
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 }
                }
            };

            await scannerRef.current.start(
                { facingMode: 'environment' }, // Back camera
                cameraConfig,
                (decodedText) => {
                    console.log('✅ QR Code detected:', decodedText.substring(0, 30) + '...');
                    
                    // Haptic feedback on successful scan
                    if ('vibrate' in navigator) {
                        navigator.vibrate([100, 50, 100]); // Short vibration pattern
                    }
                    
                    // Play success sound (optional)
                    try {
                        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdX2Bfn1+fn9/fn5+fn5+fn5+fn5+fn5+');
                        audio.volume = 0.3;
                        audio.play().catch(() => {}); // Ignore if blocked
                    } catch {}
                    
                    processQRCode(decodedText);
                },
                () => {
                    // QR code not detected, continue scanning silently
                }
            );
            
            setCameraPermission('granted');
            setIsCameraActive(true);
            setScanState('scanning');
            console.log('🎥 Camera active (HD mode, 20 FPS)');
            
        } catch (error: any) {
            console.error('Camera error:', error);
            setScanState('error');
            
            // Handle specific error types
            if (error.name === 'NotAllowedError' || error.message?.includes('Permission denied')) {
                setCameraPermission('denied');
                setErrorMessage('Kamera izni reddedildi. Lütfen tarayıcı ayarlarından kamera iznini verin.');
            } else if (error.name === 'NotFoundError' || error.message?.includes('Requested device not found')) {
                setCameraPermission('unavailable');
                setErrorMessage('Kamera bulunamadı. Cihazınızda kamera yok veya başka bir uygulama kullanıyor.');
            } else if (error.name === 'NotReadableError' || error.message?.includes('Could not start video source')) {
                setCameraPermission('unavailable');
                setErrorMessage('Kamera başlatılamadı. Başka bir uygulama kamerayı kullanıyor olabilir.');
            } else if (error.message?.includes('HTTPS')) {
                setCameraPermission('unavailable');
                setErrorMessage('Kamera sadece güvenli bağlantılarda (HTTPS) çalışır.');
            } else {
                setErrorMessage('Kamera erişimi sağlanamadı. Lütfen manuel giriş yapın.');
            }
            
            // Show manual entry when camera fails
            setShowManualEntry(true);
        }
    }, [processQRCode]);

    // Stop camera scanning
    const stopCameraScanning = useCallback(async () => {
        await safeStopCamera();
        setScanState('idle');
    }, [safeStopCamera]);

    // Manual code submission
    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (manualCode.trim()) {
            console.log('📝 Manual code submitted');
            await processQRCode(manualCode.trim());
            setManualCode('');
        }
    };

    // Reset to scan again
    const handleScanAgain = async () => {
        await safeStopCamera();
        setScanState('idle');
        setScanResult(null);
        setErrorMessage(null);
    };

    // Get status display info
    const getStatusDisplay = (status?: string) => {
        switch (status) {
            case 'in_transit':
                return { text: 'Teslim Alındı', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: '📦' };
            case 'delivered':
                return { text: 'Teslim Edildi', color: 'text-green-400', bg: 'bg-green-500/20', icon: '✅' };
            default:
                return { text: status || 'Bilinmiyor', color: 'text-gray-400', bg: 'bg-gray-500/20', icon: '❓' };
        }
    };

    // Get mode display
    const getModeDisplay = () => {
        switch (scanMode) {
            case 'pickup':
                return { title: 'Kargo Teslim Al', icon: '📦', color: 'text-blue-400' };
            case 'delivery':
                return { title: 'Kargo Teslim Et', icon: '✅', color: 'text-green-400' };
            default:
                return { title: 'QR Kod Okuyucu', icon: '📷', color: 'text-white' };
        }
    };

    const modeDisplay = getModeDisplay();

    if (isLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 flex flex-col">
            {/* Header */}
            <div className="w-full mb-4">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="btn-secondary text-sm px-3 py-2 flex items-center"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Geri
                    </button>
                    {user && (
                        <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded-full">
                            {user.firstName}
                        </span>
                    )}
                </div>

                <h1 className={`text-2xl font-bold ${modeDisplay.color} mb-1 flex items-center gap-2`}>
                    <span>{modeDisplay.icon}</span> {modeDisplay.title}
                </h1>
                <p className="text-white/70 text-sm">
                    {targetShipmentId ? `Kargo #${targetShipmentId}` : 'Kargo üzerindeki QR kodu okutun'}
                </p>
            </div>



            {/* Scanner Area */}
            <div className="w-full mb-4 flex-1">
                <div className="card h-full flex flex-col justify-center min-h-[350px]">
                    {/* Idle State */}
                    {scanState === 'idle' && (
                        <div className="text-center py-8">
                            {/* Camera Icon Visual */}
                            <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-primary-400/20 to-primary-600/20 rounded-3xl flex items-center justify-center border-2 border-dashed border-primary-500/50 relative">
                                <svg className="w-16 h-16 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {/* QR Frame Corners */}
                                <div className="absolute inset-2 border-2 border-primary-400/30 rounded-lg">
                                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary-400 rounded-tl"></div>
                                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary-400 rounded-tr"></div>
                                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary-400 rounded-bl"></div>
                                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary-400 rounded-br"></div>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">QR Kod Tarama</h3>
                            <p className="text-white/70 mb-4">Kamerayı başlatmak için butona tıklayın</p>
                            
                            <button
                                onClick={startCameraScanning}
                                className="btn-primary mb-3"
                            >
                                <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Kamerayı Başlat
                            </button>
                            
                            <button
                                onClick={() => setShowManualEntry(true)}
                                className="btn-secondary text-sm"
                            >
                                📝 Manuel Giriş
                            </button>
                        </div>
                    )}

                    {/* Initializing & Scanning States - Camera Container */}
                    {(scanState === 'initializing' || scanState === 'scanning') && (
                        <div className="text-center py-4">
                            {/* Camera Container with Frame Overlay */}
                            <div className="relative mx-auto mb-4" style={{ maxWidth: '320px' }}>
                                {/* Actual QR Reader - Always rendered so html5-qrcode can use it */}
                                <div 
                                    id="qr-reader" 
                                    className="mx-auto rounded-xl overflow-hidden bg-black/50"
                                    style={{ minHeight: '280px' }}
                                ></div>
                                
                                {/* QR Frame Overlay - Scanning Target Area */}
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                    <div className="relative w-56 h-56">
                                        {/* Corner Markers */}
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
                                        
                                        {/* Scanning Line Animation */}
                                        {scanState === 'scanning' && (
                                            <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent animate-pulse"
                                                style={{ 
                                                    animation: 'scanLine 2s ease-in-out infinite',
                                                    top: '50%'
                                                }}
                                            ></div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Loading Overlay for Initializing */}
                                {scanState === 'initializing' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl">
                                        <div className="w-12 h-12 mb-3">
                                            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
                                        </div>
                                        <p className="text-white font-medium">Kamera Başlatılıyor...</p>
                                        <p className="text-white/60 text-sm">Lütfen izin verin</p>
                                    </div>
                                )}
                            </div>
                            
                            {scanState === 'scanning' && (
                                <>
                                    <h3 className="text-lg font-bold text-white mb-1">QR Kodu Tarayın</h3>
                                    <p className="text-white/70 text-sm mb-3">Kodu yeşil çerçevenin içine yerleştirin</p>
                                    <button
                                        onClick={stopCameraScanning}
                                        className="btn-secondary text-sm"
                                    >
                                        ⏹️ Durdur
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Processing State */}
                    {scanState === 'processing' && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4">
                                <div className="inline-block h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">İşleniyor...</h3>
                            <p className="text-white/70">Kargo durumu güncelleniyor</p>
                        </div>
                    )}

                    {/* Success State */}
                    {scanState === 'success' && scanResult && (
                        <div className="text-center py-8">
                            <div className={`w-20 h-20 mx-auto mb-4 ${getStatusDisplay(scanResult.newStatus).bg} rounded-full flex items-center justify-center`}>
                                <span className="text-4xl">{getStatusDisplay(scanResult.newStatus).icon}</span>
                            </div>
                            <h3 className={`text-2xl font-bold mb-2 ${getStatusDisplay(scanResult.newStatus).color}`}>
                                {getStatusDisplay(scanResult.newStatus).text}
                            </h3>
                            <div className="glass p-4 rounded-lg mb-4 max-w-md mx-auto text-left">
                                <p className="text-white/90 mb-2">{scanResult.message}</p>
                                {scanResult.shipmentId && (
                                    <p className="text-white/60 text-sm">
                                        Kargo No: <span className="text-white font-mono">#{scanResult.shipmentId}</span>
                                    </p>
                                )}
                                {scanResult.orderNumber && (
                                    <p className="text-white/60 text-sm">
                                        Sipariş No: <span className="text-white font-mono">{scanResult.orderNumber}</span>
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-3 justify-center">
                                <button onClick={handleScanAgain} className="btn-primary">
                                    Yeni Tarama
                                </button>
                                <button onClick={() => router.push('/dashboard')} className="btn-secondary">
                                    Dashboard
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {scanState === 'error' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-red-400 mb-2">Hata</h3>
                            <p className="text-white/70 mb-4 max-w-md mx-auto">{errorMessage}</p>
                            <div className="flex gap-3 justify-center">
                                <button onClick={handleScanAgain} className="btn-primary">
                                    Tekrar Dene
                                </button>
                                <button 
                                    onClick={() => setShowManualEntry(true)} 
                                    className="btn-secondary"
                                >
                                    Manuel Giriş
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Manual Entry - Always visible when showManualEntry or camera unavailable */}
            {(showManualEntry || cameraPermission === 'denied' || cameraPermission === 'unavailable' || scanState === 'error') && (
                <div className="mb-4">
                    <div className="card">
                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                            <span>📝</span> Manuel Kod Girişi
                        </h3>
                        <p className="text-white/60 text-sm mb-4">
                            Kamera çalışmıyorsa QR token'ı buraya yapıştırabilirsiniz.
                        </p>
                        <form onSubmit={handleManualSubmit} className="space-y-3">
                            <textarea
                                id="manual-code-input"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                className="input-field min-h-[80px] font-mono text-sm"
                                placeholder="QR token'ı buraya yapıştırın..."
                                disabled={scanState === 'processing'}
                            />
                            <button 
                                type="submit" 
                                id="manual-submit-btn"
                                className="btn-primary w-full"
                                disabled={!manualCode.trim() || scanState === 'processing'}
                            >
                                {scanState === 'processing' ? 'İşleniyor...' : 'Kodu Gönder'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Scan History */}
            {scanHistory.length > 0 && (
                <div className="mb-4">
                    <div className="card">
                        <h3 className="text-lg font-bold text-white mb-3">Son Taramalar</h3>
                        <div className="space-y-2">
                            {scanHistory.slice(0, 5).map((item, index) => (
                                <div 
                                    key={index}
                                    className={`glass p-3 rounded-lg flex items-center justify-between ${
                                        item.result.success ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'
                                    }`}
                                >
                                    <div>
                                        <p className="text-white/90 text-sm">{item.result.message}</p>
                                        <p className="text-white/50 text-xs">
                                            {item.timestamp.toLocaleTimeString('tr-TR')}
                                        </p>
                                    </div>
                                    <span className="text-2xl">
                                        {item.result.success ? getStatusDisplay(item.result.newStatus).icon : '❌'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Debounce Indicator */}
            {isDebouncing && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
                    <p className="text-yellow-400 text-sm">
                        ⏳ Aynı kodun tekrar okunması engellendi (2 saniye)
                    </p>
                </div>
            )}

            {/* CSS for scanning animation */}
            <style jsx>{`
                @keyframes scanLine {
                    0%, 100% { top: 10%; opacity: 0; }
                    50% { top: 90%; opacity: 1; }
                }
            `}</style>
        </div>
    );
}

// Main export with Suspense wrapper for useSearchParams
export default function ScanPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
            </div>
        }>
            <ScanPageContent />
        </Suspense>
    );
}
