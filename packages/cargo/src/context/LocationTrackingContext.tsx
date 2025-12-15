'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';

interface LocationTrackingContextType {
    isTracking: boolean;
    isOnShift: boolean;
    latitude: number | null;
    longitude: number | null;
    shiftId: string | null;
    shiftStartTime: Date | null;
    error: string | null;
    startShift: (lat?: number, lng?: number) => Promise<void>;
    endShift: () => Promise<void>;
}

const LocationTrackingContext = createContext<LocationTrackingContextType | undefined>(undefined);

export function useLocationTracking() {
    const context = useContext(LocationTrackingContext);
    if (!context) {
        throw new Error('useLocationTracking must be used within LocationTrackingProvider');
    }
    return context;
}

export function LocationTrackingProvider({ children }: { children: React.ReactNode }) {
    const [isOnShift, setIsOnShift] = useState(false);
    const [isTracking, setIsTracking] = useState(false);
    const [shiftId, setShiftId] = useState<string | null>(null);
    const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const watchIdRef = useRef<number | null>(null);
    const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const connectionRef = useRef<signalR.HubConnection | null>(null);

    // Get carrier API base URL
    const getApiUrl = () => {
        if (typeof window !== 'undefined') {
            return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';
        }
        return 'http://localhost:8081';
    };

    // Send location to backend via REST API
    const sendLocationToApi = useCallback(async (lat: number, lng: number) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('carrier_token') : null;
        if (!token) return;

        try {
            await fetch(`${getApiUrl()}/api/carrier/shift/location`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ latitude: lat, longitude: lng })
            });
        } catch (err) {
            console.error('Failed to send location to API:', err);
        }
    }, []);

    // Send location via SignalR
    const sendLocationToSignalR = useCallback(async (lat: number, lng: number) => {
        if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
            try {
                await connectionRef.current.invoke('UpdateLocation', lat, lng);
            } catch (err) {
                console.error('Failed to send location via SignalR:', err);
            }
        }
    }, []);

    // Combined location sender
    const sendLocation = useCallback(async (lat: number, lng: number) => {
        console.log(`📍 Sending location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        await Promise.all([
            sendLocationToApi(lat, lng),
            sendLocationToSignalR(lat, lng)
        ]);
        console.log('📍 Location sent (API + SignalR)');
    }, [sendLocationToApi, sendLocationToSignalR]);

    // Initialize SignalR connection
    useEffect(() => {
        let isMounted = true;

        const initSignalR = async () => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('carrier_token') : null;
            if (!token) return;

            await new Promise(resolve => setTimeout(resolve, 100));
            if (!isMounted) return;

            const hubUrl = `${getApiUrl()}/hubs/location`;
            console.log('📡 LocationProvider: Connecting to SignalR:', hubUrl);

            const connection = new signalR.HubConnectionBuilder()
                .withUrl(hubUrl, {
                    accessTokenFactory: () => token,
                    transport: signalR.HttpTransportType.LongPolling
                })
                .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
                .configureLogging(signalR.LogLevel.Warning)
                .build();

            try {
                await connection.start();
                if (isMounted) {
                    console.log('✅ LocationProvider: SignalR connected');
                    connectionRef.current = connection;
                }
            } catch (err) {
                console.error('❌ LocationProvider: SignalR failed:', err);
            }
        };

        initSignalR();

        return () => {
            isMounted = false;
            connectionRef.current?.stop();
        };
    }, []);

    // Start location tracking
    const startTracking = useCallback(() => {
        if (!navigator.geolocation) {
            setError('Geolocation not supported');
            return;
        }

        console.log('📍 LocationProvider: Starting background tracking');

        // Request wake lock
        if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen').then(lock => {
                wakeLockRef.current = lock;
                console.log('🔒 Wake Lock active');
            }).catch(console.warn);
        }

        // Watch position
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                setLatitude(position.coords.latitude);
                setLongitude(position.coords.longitude);
            },
            (err) => {
                console.warn('Geolocation error:', err.message);
            },
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }
        );
        watchIdRef.current = watchId;

        // 30-second interval timer
        intervalIdRef.current = setInterval(() => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude: lat, longitude: lng } = position.coords;
                    console.log(`📍 Timer: Sending location every 30s`);
                    setLatitude(lat);
                    setLongitude(lng);
                    sendLocation(lat, lng);
                },
                () => {
                    // Fallback: use last known position
                    if (latitude && longitude) {
                        console.log(`📍 Timer: Using last known position`);
                        sendLocation(latitude, longitude);
                    }
                },
                { enableHighAccuracy: false, timeout: 10000, maximumAge: Infinity }
            );
        }, 30000);

        setIsTracking(true);
    }, [latitude, longitude, sendLocation]);

    // Stop tracking
    const stopTracking = useCallback(() => {
        console.log('🛑 LocationProvider: Stopping background tracking');

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        if (intervalIdRef.current) {
            clearInterval(intervalIdRef.current);
            intervalIdRef.current = null;
        }

        if (wakeLockRef.current) {
            wakeLockRef.current.release();
            wakeLockRef.current = null;
        }

        setIsTracking(false);
    }, []);

    // Start shift
    const startShift = useCallback(async (lat?: number, lng?: number) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('carrier_token') : null;
        if (!token) {
            setError('Not authenticated');
            return;
        }

        try {
            const response = await fetch(`${getApiUrl()}/api/carrier/shift/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ latitude: lat, longitude: lng })
            });

            if (!response.ok) throw new Error('Failed to start shift');

            const result = await response.json();
            setIsOnShift(true);
            setShiftId(result.shiftId);
            setShiftStartTime(new Date(result.startTime));
            setError(null);

            startTracking();

            // Notify via SignalR
            if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
                await connectionRef.current.invoke('StartShift', 'Kurye');
            }

            console.log('✅ Shift started - background tracking active');
        } catch (err: any) {
            setError(err.message);
            console.error('Failed to start shift:', err);
        }
    }, [startTracking]);

    // End shift
    const endShift = useCallback(async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('carrier_token') : null;
        if (!token) return;

        try {
            await fetch(`${getApiUrl()}/api/carrier/shift/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ latitude, longitude })
            });

            stopTracking();

            setIsOnShift(false);
            setShiftId(null);
            setShiftStartTime(null);

            // Notify via SignalR
            if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
                await connectionRef.current.invoke('EndShift');
            }

            console.log('🛑 Shift ended - background tracking stopped');
        } catch (err: any) {
            console.error('Failed to end shift:', err);
        }
    }, [latitude, longitude, stopTracking]);

    // Check for active shift on mount
    useEffect(() => {
        const checkActiveShift = async () => {
            const token = typeof window !== 'undefined' ? localStorage.getItem('carrier_token') : null;
            if (!token) return;

            try {
                const response = await fetch(`${getApiUrl()}/api/carrier/shift/current`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const shift = await response.json();
                    if (shift && shift.shiftId) {
                        console.log('📍 Active shift found, resuming tracking');
                        setIsOnShift(true);
                        setShiftId(shift.shiftId);
                        setShiftStartTime(new Date(shift.startTime));
                        setLatitude(shift.lastLatitude);
                        setLongitude(shift.lastLongitude);
                        startTracking();
                    }
                }
            } catch (err) {
                console.warn('Failed to check active shift:', err);
            }
        };

        checkActiveShift();
    }, [startTracking]);

    return (
        <LocationTrackingContext.Provider value={{
            isTracking,
            isOnShift,
            latitude,
            longitude,
            shiftId,
            shiftStartTime,
            error,
            startShift,
            endShift
        }}>
            {children}
        </LocationTrackingContext.Provider>
    );
}
