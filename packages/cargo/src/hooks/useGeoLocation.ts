'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook options for geolocation tracking
 */
export interface UseGeoLocationOptions {
    /** Enable Wake Lock to prevent screen sleep (default: true) */
    enableWakeLock?: boolean;
    /** Minimum distance in meters before sending update (default: 50) */
    minDistance?: number;
    /** Minimum interval in seconds before sending update (default: 30) */
    minInterval?: number;
    /** Callback when location is updated and ready to send */
    onLocationUpdate?: (lat: number, lng: number) => void;
    /** High accuracy mode for GPS (default: true) */
    highAccuracy?: boolean;
}

/**
 * Geolocation status
 */
export interface GeoLocationState {
    /** Current latitude */
    latitude: number | null;
    /** Current longitude */
    longitude: number | null;
    /** Last update timestamp */
    lastUpdate: Date | null;
    /** Whether tracking is active */
    isTracking: boolean;
    /** Whether Wake Lock is active */
    isWakeLockActive: boolean;
    /** Permission status */
    permissionStatus: 'prompt' | 'granted' | 'denied' | 'unavailable';
    /** Error message if any */
    error: string | null;
    /** Accuracy in meters */
    accuracy: number | null;
}

/**
 * Calculate distance between two coordinates in meters (Haversine formula)
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Custom hook for geolocation tracking with Wake Lock and smart throttling
 * 
 * Features:
 * - Wake Lock to prevent screen sleep during tracking
 * - Smart throttling: only sends updates if >50m moved OR >30s elapsed
 * - Permission handling with status tracking
 * - Error handling for various failure scenarios
 */
export function useGeoLocation(options: UseGeoLocationOptions = {}) {
    const {
        enableWakeLock = true,
        minDistance = 50,
        minInterval = 30,
        onLocationUpdate,
        highAccuracy = true
    } = options;

    const [state, setState] = useState<GeoLocationState>({
        latitude: null,
        longitude: null,
        lastUpdate: null,
        isTracking: false,
        isWakeLockActive: false,
        permissionStatus: 'prompt',
        error: null,
        accuracy: null
    });

    // Refs to track last sent position and time
    const lastSentPosition = useRef<{ lat: number; lng: number } | null>(null);
    const lastSentTime = useRef<Date | null>(null);
    const watchIdRef = useRef<number | null>(null);
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const intervalIdRef = useRef<NodeJS.Timeout | null>(null);  // Timer for forced 30s updates

    /**
     * Check if we should send this location update
     * Based on distance moved (50m) or time elapsed (30s)
     */
    const shouldSendUpdate = useCallback((lat: number, lng: number): boolean => {
        const now = new Date();
        
        // If never sent, always send
        if (!lastSentPosition.current || !lastSentTime.current) {
            return true;
        }

        // Check time elapsed (minimum interval)
        const timeElapsed = (now.getTime() - lastSentTime.current.getTime()) / 1000;
        if (timeElapsed >= minInterval) {
            console.log(`📍 Location update: ${timeElapsed.toFixed(0)}s elapsed (>= ${minInterval}s)`);
            return true;
        }

        // Check distance moved
        const distance = haversineDistance(
            lastSentPosition.current.lat,
            lastSentPosition.current.lng,
            lat,
            lng
        );
        
        if (distance >= minDistance) {
            console.log(`📍 Location update: ${distance.toFixed(0)}m moved (>= ${minDistance}m)`);
            return true;
        }

        return false;
    }, [minDistance, minInterval]);

    /**
     * Handle incoming position updates
     */
    const handlePosition = useCallback((position: GeolocationPosition) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        setState(prev => ({
            ...prev,
            latitude,
            longitude,
            accuracy,
            lastUpdate: new Date(),
            error: null
        }));

        // Check if we should send this update
        if (shouldSendUpdate(latitude, longitude)) {
            lastSentPosition.current = { lat: latitude, lng: longitude };
            lastSentTime.current = new Date();
            
            if (onLocationUpdate) {
                onLocationUpdate(latitude, longitude);
            }
        }
    }, [shouldSendUpdate, onLocationUpdate]);

    /**
     * Handle geolocation errors
     */
    const handleError = useCallback((error: GeolocationPositionError) => {
        let errorMessage = 'Konum alınamadı';
        let isCritical = true;
        
        switch (error.code) {
            case error.PERMISSION_DENIED:
                errorMessage = 'Konum izni reddedildi. Lütfen ayarlardan izin verin.';
                setState(prev => ({ ...prev, permissionStatus: 'denied' }));
                break;
            case error.POSITION_UNAVAILABLE:
                errorMessage = 'Konum bilgisi mevcut değil. GPS\'inizi kontrol edin.';
                isCritical = false; // Non-critical, will retry
                break;
            case error.TIMEOUT:
                errorMessage = 'Konum alınamadı, tekrar deneniyor...';
                isCritical = false; // Non-critical, watchPosition will retry automatically
                break;
        }
        
        // Only log as error for critical issues, warn for retryable ones
        if (isCritical) {
            console.error('Geolocation error:', errorMessage);
            setState(prev => ({ ...prev, error: errorMessage }));
        } else {
            console.warn('Geolocation warning:', errorMessage);
            // Don't set error state for non-critical issues
        }
    }, []);

    /**
     * Request Wake Lock to prevent screen sleep
     */
    const requestWakeLock = useCallback(async () => {
        if (!enableWakeLock || !('wakeLock' in navigator)) {
            console.warn('Wake Lock API not available');
            return;
        }

        try {
            const lock = await navigator.wakeLock.request('screen');
            wakeLockRef.current = lock;
            setState(prev => ({ ...prev, isWakeLockActive: true }));
            console.log('🔒 Wake Lock active - screen will stay on');

            lock.addEventListener('release', () => {
                console.log('🔓 Wake Lock released');
                setState(prev => ({ ...prev, isWakeLockActive: false }));
            });
        } catch (err) {
            console.warn('Wake Lock request failed:', err);
        }
    }, [enableWakeLock]);

    /**
     * Release Wake Lock
     */
    const releaseWakeLock = useCallback(async () => {
        if (wakeLockRef.current) {
            await wakeLockRef.current.release();
            wakeLockRef.current = null;
        }
    }, []);

    /**
     * Start tracking location
     */
    const startTracking = useCallback(async () => {
        // Check for geolocation support
        if (!navigator.geolocation) {
            setState(prev => ({
                ...prev,
                permissionStatus: 'unavailable',
                error: 'Geolocation API bu cihazda desteklenmiyor'
            }));
            return false;
        }

        console.log('📍 Geolocation started');

        // Reset last sent tracking so first location is sent immediately
        lastSentPosition.current = null;
        lastSentTime.current = null;

        // Request Wake Lock
        await requestWakeLock();

        // Start watching position with generous timeout settings
        const watchId = navigator.geolocation.watchPosition(
            handlePosition,
            handleError,
            {
                enableHighAccuracy: highAccuracy,
                timeout: 30000,      // 30 seconds - more time for GPS fix
                maximumAge: 60000    // Accept positions up to 60 seconds old
            }
        );

        watchIdRef.current = watchId;
        
        // Start 30-second interval timer to force location updates
        // This ensures updates happen exactly every minInterval regardless of GPS events
        intervalIdRef.current = setInterval(() => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    console.log(`📍 Timer: Forcing location update every ${minInterval}s`);
                    
                    // Update state
                    setState(prev => ({
                        ...prev,
                        latitude,
                        longitude,
                        accuracy: position.coords.accuracy,
                        lastUpdate: new Date(),
                        error: null
                    }));
                    
                    // Send update
                    lastSentPosition.current = { lat: latitude, lng: longitude };
                    lastSentTime.current = new Date();
                    if (onLocationUpdate) {
                        onLocationUpdate(latitude, longitude);
                    }
                },
                (error) => {
                    // Fallback: use last known position from state
                    console.warn('Timer: getCurrentPosition failed, using last known position');
                    setState(prev => {
                        if (prev.latitude && prev.longitude && onLocationUpdate) {
                            console.log(`📍 Timer: Sending last known position: ${prev.latitude.toFixed(4)}, ${prev.longitude.toFixed(4)}`);
                            lastSentTime.current = new Date();
                            onLocationUpdate(prev.latitude, prev.longitude);
                        }
                        return prev;
                    });
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: Infinity }  // Quick timeout, use any cached
            );
        }, minInterval * 1000);
        
        setState(prev => ({
            ...prev,
            isTracking: true,
            permissionStatus: 'granted',
            error: null
        }));

        return true;
    }, [handlePosition, handleError, highAccuracy, requestWakeLock, minInterval, onLocationUpdate]);

    /**
     * Stop tracking location
     */
    const stopTracking = useCallback(async () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        // Clear the interval timer
        if (intervalIdRef.current !== null) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
        }

        await releaseWakeLock();

        console.log('🛑 Geolocation stopped');
        
        setState(prev => ({
            ...prev,
            isTracking: false
        }));

        // Reset sent position tracking
        lastSentPosition.current = null;
        lastSentTime.current = null;
    }, [releaseWakeLock]);

    /**
     * Get current position once (not continuous tracking)
     */
    const getCurrentPosition = useCallback((): Promise<GeolocationPosition> => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    handlePosition(position);
                    resolve(position);
                },
                (error) => {
                    handleError(error);
                    reject(error);
                },
                {
                    enableHighAccuracy: false, // Accept any position for faster response
                    timeout: 30000,  // 30 seconds timeout
                    maximumAge: Infinity  // Accept any cached position
                }
            );
        });
    }, [handlePosition, handleError]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
            if (wakeLockRef.current) {
                wakeLockRef.current.release();
            }
        };
    }, []);

    // Re-acquire Wake Lock when page becomes visible again
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && state.isTracking && enableWakeLock) {
                await requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [state.isTracking, enableWakeLock, requestWakeLock]);

    return {
        ...state,
        startTracking,
        stopTracking,
        getCurrentPosition
    };
}

export default useGeoLocation;
