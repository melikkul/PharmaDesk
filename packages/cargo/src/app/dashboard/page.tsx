'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCarrierAuth } from '@/context/CarrierAuthContext';
import { useLocationTracking } from '@/context/LocationTrackingContext';
import Link from 'next/link';
import { carrierApi, ShiftStatusResponse, CarrierShipment, NextPharmacy } from '@/services/carrierApi';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { useLocationHub } from '@/hooks/useLocationHub';

export default function DashboardPage() {
    const { user, isLoading, logout } = useCarrierAuth();
    const router = useRouter();
    
    // SignalR hub for real-time location updates to admin panel
    const { connected: hubConnected, sendLocation: sendLocationToHub, startShift: notifyShiftStart, endShift: notifyShiftEnd } = useLocationHub();
    
    // Shift state - now persisted via API
    const [isOnShift, setIsOnShift] = useState(false);
    const isOnShiftRef = useRef(false); // Ref to avoid stale closure in callbacks
    const [shiftId, setShiftId] = useState<number | null>(null);
    const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [shiftLoading, setShiftLoading] = useState(true);
    const [shiftError, setShiftError] = useState<string | null>(null);
    
    const [assignedShipments, setAssignedShipments] = useState<CarrierShipment[]>([]);
    const [nextPharmacy, setNextPharmacy] = useState<NextPharmacy | null>(null);
    const [loadingShipments, setLoadingShipments] = useState(false);

    // Wake Lock reference
    // State for confirmation modal
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);
    
    // Geolocation hook with location updates to backend
    const {
        latitude,
        longitude,
        isTracking,
        startTracking,
        stopTracking,
        getCurrentPosition,
        permissionStatus: geoPermission
    } = useGeoLocation({
        enableWakeLock: true,
        minDistance: 50,  // 50 meters
        minInterval: 30,  // 30 seconds
        onLocationUpdate: async (lat, lng) => {
            // Send location to backend when on shift - use ref to avoid stale closure
            if (isOnShiftRef.current) {
                try {
                    // Send via REST API
                    await carrierApi.updateShiftLocation(lat, lng);
                    // Also send via SignalR for real-time admin updates
                    await sendLocationToHub(lat, lng);
                    console.log('📍 Location sent (API + SignalR):', lat.toFixed(6), lng.toFixed(6));
                } catch (error) {
                    console.error('Failed to send location:', error);
                }
            } else {
                console.log('📍 Location update received but not on shift, skipping send');
            }
        }
    });

    // Keep ref in sync with state
    useEffect(() => {
        isOnShiftRef.current = isOnShift;
    }, [isOnShift]);

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    // Load shift status on mount
    useEffect(() => {
        if (user) {
            loadShiftStatus();
            loadShipments();
        }
    }, [user]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wakeLock) {
                wakeLock.release();
            }
        };
    }, [wakeLock]);

    // Simple timer - increments elapsedSeconds every second
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        
        if (isOnShift && shiftStartTime) {
            // Calculate initial elapsed time
            const now = new Date();
            const initialElapsed = Math.floor((now.getTime() - shiftStartTime.getTime()) / 1000);
            setElapsedSeconds(initialElapsed);
            
            // Start interval to increment every second
            intervalId = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else {
            setElapsedSeconds(0);
        }
        
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isOnShift, shiftStartTime]);

    // Format elapsed seconds to HH:MM:SS
    const formatDuration = (totalSeconds: number): string => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Parse date as UTC (backend returns UTC without Z suffix)
    const parseUTCDate = (dateString: string): Date => {
        // If the date string doesn't have timezone info, treat it as UTC
        if (!dateString.endsWith('Z') && !dateString.includes('+')) {
            return new Date(dateString + 'Z');
        }
        return new Date(dateString);
    };

    const loadShiftStatus = async () => {
        try {
            setShiftLoading(true);
            setShiftError(null);
            
            const status = await carrierApi.getShiftStatus();
            
            setIsOnShift(status.isOnShift);
            setShiftId(status.shiftId);
            
            if (status.startTime) {
                const startDate = parseUTCDate(status.startTime);
                setShiftStartTime(startDate);
                
                // Calculate elapsed immediately
                const now = new Date();
                const elapsed = Math.floor((now.getTime() - startDate.getTime()) / 1000);
                setElapsedSeconds(Math.max(0, elapsed)); // Ensure non-negative
                
                console.log('✅ Shift restored from server. StartTime:', startDate.toISOString(), 'Elapsed:', elapsed, 'seconds');
            } else {
                setShiftStartTime(null);
                setElapsedSeconds(0);
            }
            
            // If on shift, start tracking location
            if (status.isOnShift) {
                await requestWakeLock();
                startTracking();
            }
        } catch (error: any) {
            console.error('Failed to load shift status:', error);
            setShiftError('Mesai durumu yüklenemedi');
        } finally {
            setShiftLoading(false);
        }
    };

    const loadShipments = async () => {
        setLoadingShipments(true);
        try {
            const response = await carrierApi.getMyShipments();
            setAssignedShipments(response.shipments);
            setNextPharmacy(response.nextPharmacy);
            console.log(`📦 Loaded ${response.totalCount} shipments (${response.pendingCount} pending, ${response.inTransitCount} in transit)`);
        } catch (error) {
            console.error('Failed to load shipments:', error);
            // Keep existing shipments on error
        } finally {
            setLoadingShipments(false);
        }
    };

    const requestWakeLock = async () => {
        if (!('wakeLock' in navigator)) {
            console.warn('Wake Lock API not available');
            return;
        }

        try {
            const lock = await navigator.wakeLock.request('screen');
            setWakeLock(lock);
            console.log('🔒 Wake Lock active - screen will stay on');

            lock.addEventListener('release', () => {
                console.log('🔓 Wake Lock released');
            });
        } catch (err) {
            console.warn('Wake Lock request failed:', err);
        }
    };

    const releaseWakeLock = async () => {
        if (wakeLock) {
            await wakeLock.release();
            setWakeLock(null);
        }
    };

    // Handle toggle click - show confirmation modal or end shift directly
    const handleShiftToggleClick = () => {
        if (!isOnShift) {
            // Show confirmation modal
            setShowConfirmModal(true);
        } else {
            // Ending shift - no confirmation needed
            executeShiftToggle();
        }
    };

    // Actual toggle logic - called after modal confirmation
    const executeShiftToggle = async () => {
        setShowConfirmModal(false); // Close modal if open
        
        try {
            setShiftLoading(true);
            setShiftError(null);
            
            if (!isOnShift) {
                // Starting shift - get fresh location
                let currentLat = latitude;
                let currentLng = longitude;
                
                try {
                    console.log('📍 Mesai başlatma için güncel konum alınıyor...');
                    // Timeout after 5 seconds to prevent UI freezing
                    const positionPromise = getCurrentPosition();
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Konum alma zaman aşımı')), 5000)
                    );
                    
                    const position = await Promise.race([positionPromise, timeoutPromise]) as GeolocationPosition;
                    currentLat = position.coords.latitude;
                    currentLng = position.coords.longitude;
                    console.log('✅ Güncel konum alındı:', currentLat?.toFixed(6), currentLng?.toFixed(6));
                } catch (locError) {
                    console.warn('⚠️ Konum alınamadı veya zaman aşımı, mevcut değerler kullanılıyor:', locError);
                }
                
                try {
                    const result = await carrierApi.startShift(currentLat ?? undefined, currentLng ?? undefined);
                    
                    const startDate = parseUTCDate(result.startTime);
                    setIsOnShift(true);
                    isOnShiftRef.current = true;
                    setShiftId(result.shiftId);
                    setShiftStartTime(startDate);
                    setElapsedSeconds(0);
                    
                    await requestWakeLock();
                    startTracking();
                    
                    // Notify admin panel via SignalR
                    const carrierName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Kurye';
                    await notifyShiftStart(carrierName);
                    
                    console.log('✅ Shift started:', result.message);
                } catch (apiError: any) {
                    // Check if error is "Already active shift"
                    if (apiError.response?.data?.error?.includes('Zaten aktif') || 
                        apiError.response?.data?.error?.includes('aktif bir mesainiz var')) {
                        console.log('🔄 Mesai zaten aktif, durumu senkronize ediyorum...');
                        // Silent sync - no alert needed
                        const status = await carrierApi.getShiftStatus();
                        if (status.isOnShift) {
                            setIsOnShift(true);
                            isOnShiftRef.current = true;
                            setShiftId(status.shiftId);
                            setShiftStartTime(status.startTime ? parseUTCDate(status.startTime) : new Date());
                            setElapsedSeconds(status.durationMinutes * 60);
                            startTracking();
                            setShiftError(null); // Clear any potential error
                        }
                    } else {
                        throw apiError;
                    }
                }
                
            } else {
                // Ending shift
                const result = await carrierApi.endShift(latitude ?? undefined, longitude ?? undefined);
                
                setIsOnShift(false);
                isOnShiftRef.current = false;
                setShiftId(null);
                setShiftStartTime(null);
                setElapsedSeconds(0);
                
                await releaseWakeLock();
                stopTracking();
                
                // Notify admin panel via SignalR
                await notifyShiftEnd();
                
                console.log('🛑 Shift ended:', result.message, '- Duration:', result.durationMinutes, 'minutes');
            }
        } catch (error: any) {
            console.error('Shift toggle error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Mesai durumu değiştirilemedi';
            setShiftError(errorMessage);
        } finally {
            setShiftLoading(false);
        }
    };

    // Open Google Maps for navigation
    const openGoogleMaps = (shipment: CarrierShipment) => {
        const query = shipment.pharmacyLat && shipment.pharmacyLng 
            ? `${shipment.pharmacyLat},${shipment.pharmacyLng}`
            : encodeURIComponent(shipment.pharmacyAddress);
        
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=driving`;
        window.open(mapsUrl, '_blank');
    };

    // Get status badge - matches API status values
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return { text: 'Beklemede', bg: 'bg-yellow-500/20', color: 'text-yellow-300', icon: '⏳' };
            case 'shipped':
                return { text: 'Gönderildi', bg: 'bg-orange-500/20', color: 'text-orange-300', icon: '📦' };
            case 'intransit':
                return { text: 'Yolda', bg: 'bg-blue-500/20', color: 'text-blue-300', icon: '🚚' };
            case 'delivered':
                return { text: 'Teslim Edildi', bg: 'bg-green-500/20', color: 'text-green-300', icon: '✅' };
            case 'cancelled':
                return { text: 'İptal', bg: 'bg-red-500/20', color: 'text-red-300', icon: '❌' };
            default:
                return { text: status, bg: 'bg-gray-500/20', color: 'text-gray-300', icon: '❓' };
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
        <div className="min-h-screen p-4 md:p-6 pb-32 relative">
            {/* Custom Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-xl border border-white/10 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-4 text-primary-400">
                            <span className="text-3xl">🚀</span>
                            <h3 className="text-xl font-bold text-white">Mesai Başlat</h3>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                            <p className="text-white/80">Mesaiyi başlatmak üzeresiniz.</p>
                            <div className="bg-white/5 p-3 rounded-lg space-y-2 text-sm">
                                <p className="flex items-center gap-2 text-white/70">
                                    <span>📍</span> Konumunuz takip edilecektir
                                </p>
                                <p className="flex items-center gap-2 text-white/70">
                                    <span>🔒</span> Ekran kapanması önlenecektir
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={executeShiftToggle}
                                className="flex-1 px-4 py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-500 transition-colors shadow-lg shadow-primary-500/20"
                            >
                                Başlat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header with Profile */}
            <div className="max-w-4xl mx-auto mb-6">
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-white mb-1">
                                Hoş geldin, {user.firstName}!
                            </h1>
                            <p className="text-white/70 text-sm">{user.email}</p>
                        </div>
                        <button
                            onClick={logout}
                            className="btn-secondary text-sm px-3 py-2"
                        >
                            Çıkış
                        </button>
                    </div>
                </div>
            </div>

            {/* Shift Status Bar */}
            <div className="max-w-4xl mx-auto mb-6">
                <div className={`card transition-all ${isOnShift ? 'border-2 border-green-500/50 bg-green-500/5' : ''}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isOnShift ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                                <span className="text-2xl">{isOnShift ? '🟢' : '⚫'}</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    Mesai Durumu
                                </h2>
                                {shiftLoading ? (
                                    <p className="text-white/60 text-sm">Yükleniyor...</p>
                                ) : shiftError ? (
                                    <p className="text-red-400 text-sm">{shiftError}</p>
                                ) : (
                                    <p className={`text-sm ${isOnShift ? 'text-green-400' : 'text-white/60'}`}>
                                        {isOnShift ? (
                                            <>
                                                <span className="font-mono text-xl font-bold tabular-nums">
                                                    {formatDuration(elapsedSeconds)}
                                                </span>
                                                <span className="text-white/60 ml-2">süredir aktif</span>
                                            </>
                                        ) : (
                                            'Mesai dışı'
                                        )}
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        {/* Toggle Switch */}
                        <button
                            onClick={handleShiftToggleClick}
                            disabled={shiftLoading}
                            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                                isOnShift ? 'bg-green-500' : 'bg-gray-600'
                            } ${shiftLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <span className="sr-only">Mesai Toggle</span>
                            <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                                    isOnShift ? 'translate-x-9' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Action Buttons - Teslim Al / Teslim Et */}
            {isOnShift && (
                <div className="max-w-4xl mx-auto mb-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Link href="/scan?mode=pickup">
                            <div className="card hover:bg-white/15 transition-all cursor-pointer group h-full">
                                <div className="flex flex-col items-center text-center py-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-3">
                                        <span className="text-3xl">📦</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Teslim Al</h3>
                                    <p className="text-white/60 text-sm">Kargo teslim al</p>
                                </div>
                            </div>
                        </Link>
                        
                        <Link href="/scan?mode=delivery">
                            <div className="card hover:bg-white/15 transition-all cursor-pointer group h-full">
                                <div className="flex flex-col items-center text-center py-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform mb-3">
                                        <span className="text-3xl">✅</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Teslim Et</h3>
                                    <p className="text-white/60 text-sm">Kargo teslim et</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            )}

            {/* Assigned Shipments / Route List */}
            {isOnShift && (
                <div className="max-w-4xl mx-auto mb-6">
                    {/* Next Pharmacy Header Card */}
                    {nextPharmacy && (
                        <div className="card bg-gradient-to-r from-primary-600/30 to-primary-400/20 border border-primary-500/30 mb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-primary-500/30 flex items-center justify-center">
                                    <span className="text-2xl">🏥</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-primary-300 text-sm font-medium mb-1">📍 Sonraki Eczane</p>
                                    <h3 className="text-white font-bold text-lg">{nextPharmacy.pharmacyName}</h3>
                                    <p className="text-white/70 text-sm">{nextPharmacy.pharmacyAddress}</p>
                                    {nextPharmacy.pharmacyPhone && (
                                        <a href={`tel:${nextPharmacy.pharmacyPhone}`} className="text-primary-400 text-sm hover:underline">
                                            📞 {nextPharmacy.pharmacyPhone}
                                        </a>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        const query = nextPharmacy.lat && nextPharmacy.lng 
                                            ? `${nextPharmacy.lat},${nextPharmacy.lng}`
                                            : encodeURIComponent(nextPharmacy.pharmacyAddress);
                                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=driving`, '_blank');
                                    }}
                                    className="btn-primary px-4 py-3 flex items-center gap-2"
                                >
                                    <span>🗺️</span>
                                    Yol Tarifi
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-white">📋 Atanmış Kargolar</h2>
                            <button 
                                onClick={loadShipments}
                                className="text-sm text-primary-400 hover:text-primary-300"
                                disabled={loadingShipments}
                            >
                                {loadingShipments ? 'Yükleniyor...' : '🔄 Yenile'}
                            </button>
                        </div>
                        
                        {loadingShipments ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-500 border-r-transparent"></div>
                            </div>
                        ) : assignedShipments.length === 0 ? (
                            <div className="text-center py-8 text-white/60">
                                <span className="text-4xl mb-2 block">📭</span>
                                <p>Atanmış kargo bulunmuyor</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {assignedShipments.map((shipment, index) => {
                                    const status = getStatusBadge(shipment.status);
                                    const isDelivered = shipment.status === 'delivered';
                                    const isNext = nextPharmacy?.id === shipment.id;
                                    const queuePosition = index + 1; // 1-indexed
                                    const isInTop5 = queuePosition <= 5 && !isDelivered;
                                    
                                    return (
                                        <div 
                                            key={shipment.id}
                                            className={`glass p-4 rounded-xl transition-all ${
                                                isNext ? 'border-2 border-primary-500/50 bg-primary-500/10' : 
                                                isDelivered ? 'opacity-60' : ''
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        {/* Sıra numarası */}
                                                        {!isDelivered && (
                                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                                isInTop5 ? 'bg-green-500 text-white' : 'bg-white/20 text-white/70'
                                                            }`}>
                                                                {queuePosition}
                                                            </span>
                                                        )}
                                                        
                                                        <span className={`${status.bg} ${status.color} text-xs px-2 py-1 rounded-full font-medium`}>
                                                            {status.icon} {status.text}
                                                        </span>
                                                        <span className="text-white/50 text-xs font-mono">#{shipment.id}</span>
                                                        {isNext && (
                                                            <span className="bg-primary-500/30 text-primary-300 text-xs px-2 py-1 rounded-full">
                                                                ⭐ Sıradaki
                                                            </span>
                                                        )}
                                                        {shipment.isAssignedToMe && !isDelivered && (
                                                            <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded-full">
                                                                👤 Bana Atandı
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className="text-white font-medium">{shipment.pharmacyName}</h4>
                                                    <p className="text-white/60 text-sm">{shipment.pharmacyAddress}</p>
                                                    {shipment.pharmacyPhone && (
                                                        <a href={`tel:${shipment.pharmacyPhone}`} className="text-white/50 text-xs hover:text-primary-400">
                                                            📞 {shipment.pharmacyPhone}
                                                        </a>
                                                    )}
                                                    
                                                    {/* Canlı Takip Badge - İlk 5 için */}
                                                    {isInTop5 && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <span className="inline-flex items-center gap-1.5 bg-green-500/20 text-green-400 text-xs px-2.5 py-1 rounded-full">
                                                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                                                Canlı Takip Aktif
                                                            </span>
                                                            <span className="text-white/40 text-xs">
                                                                Eczane konumunuzu görebilir
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Status indicator on the right */}
                                                <div className={`w-12 h-12 rounded-full ${status.bg} flex items-center justify-center`}>
                                                    <span className="text-xl">{status.icon}</span>
                                                </div>
                                            </div>
                                            
                                            {shipment.medicationName && (
                                                <div className="bg-white/5 rounded-lg p-2 mt-3">
                                                    <p className="text-white/80 text-sm">
                                                        💊 {shipment.medicationName} 
                                                        {shipment.quantity && <span className="text-white/50"> × {shipment.quantity}</span>}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Profile Info (Collapsed) */}
            <div className="max-w-4xl mx-auto">
                <details className="card">
                    <summary className="cursor-pointer text-lg font-bold text-white flex items-center justify-between">
                        <span>👤 Profil Bilgileri</span>
                        <svg className="w-5 h-5 text-white/50 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </summary>
                    <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                        {user.vehicleInfo && (
                            <div>
                                <p className="text-white/60 mb-1">Araç Bilgisi</p>
                                <p className="text-white font-medium">{user.vehicleInfo}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-white/60 mb-1">Durum</p>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                user.status === 'Active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                            }`}>
                                {user.status === 'Active' ? 'Aktif' : 'Askıda'}
                            </span>
                        </div>
                    </div>
                </details>
            </div>
        </div>
    );
}
