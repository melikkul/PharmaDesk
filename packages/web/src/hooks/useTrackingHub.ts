'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';

interface CarrierLocation {
    carrierId: number;
    latitude: number;
    longitude: number;
    lastUpdate: string;
    carrierName?: string;
}

interface UseTrackingHubOptions {
    shipmentId: number;
    carrierId: number | null;
    enabled: boolean;
    /** Initial carrier location from API - displayed immediately on page load */
    initialLocation?: {
        latitude: number;
        longitude: number;
        lastUpdate: string;
    } | null;
}

/**
 * useTrackingHub - SignalR hook for real-time carrier location updates
 * Only connects when enabled (RemainingStops <= 5)
 * Uses initialLocation from API for immediate display
 */
export function useTrackingHub({ shipmentId, carrierId, enabled, initialLocation }: UseTrackingHubOptions) {
    // Use initialLocation from API as default if available
    const [carrierLocation, setCarrierLocation] = useState<CarrierLocation | null>(
        initialLocation && carrierId ? {
            carrierId: carrierId,
            latitude: initialLocation.latitude,
            longitude: initialLocation.longitude,
            lastUpdate: initialLocation.lastUpdate
        } : null
    );
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const connectionRef = useRef<signalR.HubConnection | null>(null);

    const handleLocationUpdate = useCallback((location: CarrierLocation) => {
        console.log('🔄 [handleLocationUpdate] Checking location:', location);
        console.log('   → Filter carrierId:', carrierId, '| Received carrierId:', location?.carrierId);
        if (location.carrierId === carrierId) {
            console.log('   ✅ Match! Updating carrierLocation state');
            setCarrierLocation({
                ...location,
                lastUpdate: location.lastUpdate || new Date().toISOString()
            });
        } else {
            console.log('   ⏭️ Skipped - carrierId mismatch');
        }
    }, [carrierId]);

    // Sync initialLocation from API when it becomes available (async fetch)
    useEffect(() => {
        if (initialLocation && carrierId && !carrierLocation) {
            console.log('📍 [useTrackingHub] Setting initial location from API:', initialLocation);
            setCarrierLocation({
                carrierId: carrierId,
                latitude: initialLocation.latitude,
                longitude: initialLocation.longitude,
                lastUpdate: initialLocation.lastUpdate
            });
        }
    }, [initialLocation, carrierId, carrierLocation]);

    useEffect(() => {
        console.log('🔌 [useTrackingHub] Effect triggered:', { enabled, carrierId, shipmentId });
        
        if (!enabled || !carrierId) {
            console.log('🔌 [useTrackingHub] Skipped - enabled:', enabled, ', carrierId:', carrierId);
            // Cleanup existing connection if disabled
            if (connectionRef.current) {
                connectionRef.current.stop().catch(() => {});
                connectionRef.current = null;
                setConnected(false);
            }
            return;
        }
        
        console.log('🔌 [useTrackingHub] Starting connection for carrierId:', carrierId);

        let isMounted = true;

        const startConnection = async () => {
            // Token is stored as HttpOnly cookie, so we use cookie-based auth
            // withCredentials: true will automatically send cookies with the connection
            
            // Use direct backend URL for SignalR because Next.js rewrites don't support WebSocket upgrades
            // In production, this should use the actual backend URL
            const hubUrl = typeof window !== 'undefined' && window.location.hostname === 'localhost'
                ? 'http://localhost:8081/hubs/location'
                : '/hubs/location';

            console.log('🔌 [SignalR] Connecting to:', hubUrl);

            const connection = new signalR.HubConnectionBuilder()
                .withUrl(hubUrl, {
                    // Use cookie-based auth - cookies are sent automatically
                    withCredentials: true,
                    // Try WebSockets first, fallback to ServerSentEvents, then LongPolling
                    transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents | signalR.HttpTransportType.LongPolling
                })
                .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
                .configureLogging(signalR.LogLevel.Information)
                .build();

            // Handle carrier location updates (alternative event name)
            connection.on('CarrierLocationUpdate', (location: CarrierLocation) => {
                console.log('📡 [SignalR] CarrierLocationUpdate received:', location);
                if (isMounted) {
                    handleLocationUpdate(location);
                }
            });

            // Handle receiving location updates from backend
            connection.on('ReceiveLocationUpdate', (location: CarrierLocation) => {
                console.log('📡 [SignalR] ReceiveLocationUpdate received:', location);
                console.log('   → Current carrierId filter:', carrierId);
                console.log('   → Location carrierId:', location?.carrierId);
                if (isMounted) {
                    handleLocationUpdate(location);
                }
            });
            
            // Handle receiving all locations on initial connect
            connection.on('ReceiveAllLocations', (locations: CarrierLocation[]) => {
                console.log('📡 [SignalR] ReceiveAllLocations received:', locations);
                if (isMounted && locations?.length > 0) {
                    const myCarrier = locations.find(loc => loc.carrierId === carrierId);
                    if (myCarrier) {
                        console.log('   → Found my carrier:', myCarrier);
                        handleLocationUpdate(myCarrier);
                    }
                }
            });

            connection.onreconnecting(() => {
                if (isMounted) setConnected(false);
            });

            connection.onreconnected(() => {
                if (isMounted) setConnected(true);
            });

            connection.onclose(() => {
                if (isMounted) setConnected(false);
            });

            try {
                await connection.start();
                if (isMounted) {
                    console.log('✅ Connected to LocationHub for tracking');
                    setConnected(true);
                    connectionRef.current = connection;
                    setError(null);
                } else {
                    connection.stop().catch(() => {});
                }
            } catch (err) {
                if (isMounted) {
                    console.error('❌ SignalR connection failed:', err);
                    setError('Canlı takip bağlantısı kurulamadı');
                }
            }
        };

        // Delay slightly to avoid React StrictMode issues
        const timeout = setTimeout(startConnection, 100);

        return () => {
            isMounted = false;
            clearTimeout(timeout);
            if (connectionRef.current) {
                connectionRef.current.stop().catch(() => {});
                connectionRef.current = null;
            }
        };
    }, [enabled, carrierId, handleLocationUpdate]);

    return {
        carrierLocation,
        connected,
        error
    };
}
