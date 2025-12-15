'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';

interface UseLocationHubResult {
    connected: boolean;
    sendLocation: (latitude: number, longitude: number) => Promise<void>;
    startShift: (carrierName: string) => Promise<void>;
    endShift: () => Promise<void>;
}

/**
 * Hook to connect to LocationHub and send real-time location updates to admin panel
 */
export function useLocationHub(): UseLocationHubResult {
    const [connected, setConnected] = useState(false);
    const connectionRef = useRef<signalR.HubConnection | null>(null);

    useEffect(() => {
        let isMounted = true;
        let connection: signalR.HubConnection | null = null;
        
        const token = localStorage.getItem('carrier_token');
        if (!token) {
            console.log('No token found, skipping LocationHub connection');
            return;
        }

        const backendUrl = 'http://localhost:8081';
        const hubUrl = `${backendUrl}/hubs/location`;

        const startConnection = async () => {
            // Delay to handle React StrictMode cleanup
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (!isMounted) {
                console.log('Component unmounted before connection start, aborting');
                return;
            }

            console.log('📡 Connecting to LocationHub:', hubUrl);

            connection = new signalR.HubConnectionBuilder()
                .withUrl(hubUrl, {
                    accessTokenFactory: () => token,
                    transport: signalR.HttpTransportType.LongPolling
                })
                .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
                .configureLogging(signalR.LogLevel.Warning)
                .build();

            connection.onreconnecting(() => {
                console.log('🔄 Reconnecting to LocationHub...');
                if (isMounted) setConnected(false);
            });

            connection.onreconnected(() => {
                console.log('✅ Reconnected to LocationHub');
                if (isMounted) setConnected(true);
            });

            connection.onclose(() => {
                console.log('🔌 Disconnected from LocationHub');
                if (isMounted) setConnected(false);
            });

            try {
                await connection.start();
                if (isMounted) {
                    console.log('✅ Connected to LocationHub (Cargo)');
                    setConnected(true);
                    connectionRef.current = connection;
                } else {
                    connection.stop().catch(() => {});
                }
            } catch (err) {
                if (isMounted) {
                    console.error('❌ Failed to connect to LocationHub:', err);
                }
            }
        };

        startConnection();

        return () => {
            isMounted = false;
            if (connection) {
                connection.stop().catch(() => {});
            }
        };
    }, []);

    const sendLocation = useCallback(async (latitude: number, longitude: number) => {
        if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) {
            console.log('Not connected to LocationHub, skipping location update');
            return;
        }

        try {
            await connectionRef.current.invoke('UpdateLocation', latitude, longitude);
            console.log('📍 Location sent via SignalR:', latitude.toFixed(4), longitude.toFixed(4));
        } catch (err) {
            console.error('Failed to send location via SignalR:', err);
        }
    }, []);

    const startShift = useCallback(async (carrierName: string) => {
        if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) {
            return;
        }

        try {
            await connectionRef.current.invoke('StartShift', carrierName);
            console.log('📍 Shift started notification sent via SignalR');
        } catch (err) {
            console.error('Failed to send shift start via SignalR:', err);
        }
    }, []);

    const endShift = useCallback(async () => {
        if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) {
            return;
        }

        try {
            await connectionRef.current.invoke('EndShift');
            console.log('📍 Shift ended notification sent via SignalR');
        } catch (err) {
            console.error('Failed to send shift end via SignalR:', err);
        }
    }, []);

    return {
        connected,
        sendLocation,
        startShift,
        endShift
    };
}
