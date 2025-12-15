'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import * as signalR from '@microsoft/signalr';
import styles from './LiveCarrierMap.module.css';
import { useAuth } from '../../context/AuthContext';

// Types
interface ActiveCarrier {
    carrierId: number;
    carrierName: string;
    email: string;
    phoneNumber: string | null;
    shiftId: number;
    shiftStartTime: string;
    latitude: number | null;
    longitude: number | null;
    lastLocationUpdate: string | null;
    isOnShift: boolean;
    isOnline?: boolean;
}

// Default center: Ankara, Turkey
const DEFAULT_CENTER = { lat: 39.9334, lng: 32.8597 };

export default function LiveCarrierMap() {
    const { api } = useAuth();
    const [activeCarriers, setActiveCarriers] = useState<ActiveCarrier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);
    const [selectedCarrier, setSelectedCarrier] = useState<ActiveCarrier | null>(null);
    const hubConnection = useRef<signalR.HubConnection | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<Map<number, any>>(new Map());

    // Initialize SignalR connection with abort handling for React StrictMode
    useEffect(() => {
        let isMounted = true;
        let connection: signalR.HubConnection | null = null;
        
        // Check both localStorage and sessionStorage for admin token
        const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
        if (!token) {
            console.log('No admin_token found, skipping SignalR connection');
            return;
        }

        // Use direct backend URL - proxy causes issues with POST requests
        const backendUrl = 'http://localhost:8081';
        const hubUrl = `${backendUrl}/hubs/location`;

        const startConnection = async () => {
            // Delay slightly to allow for React StrictMode cleanup
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (!isMounted) {
                console.log('Component unmounted before connection start, aborting');
                return;
            }

            console.log('📡 Connecting to SignalR hub:', hubUrl);

            connection = new signalR.HubConnectionBuilder()
                .withUrl(hubUrl, {
                    accessTokenFactory: () => token,
                    transport: signalR.HttpTransportType.LongPolling
                })
                .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
                .configureLogging(signalR.LogLevel.Warning)
                .build();

            // Handle incoming location updates
            connection.on('ReceiveLocationUpdate', (location: any) => {
                if (!isMounted) return;
                console.log('📍 Location update received:', location);
                updateCarrierLocation(location);
            });

            // Handle receiving all locations on connect
            connection.on('ReceiveAllLocations', (locations: any[]) => {
                if (!isMounted) return;
                console.log('📍 All locations received:', locations);
                locations.forEach(loc => updateCarrierLocation(loc));
            });

            connection.onreconnecting(() => { if (isMounted) setConnected(false); });
            connection.onreconnected(() => { if (isMounted) setConnected(true); });
            connection.onclose(() => { if (isMounted) setConnected(false); });

            try {
                await connection.start();
                if (isMounted) {
                    console.log('✅ Connected to LocationHub');
                    setConnected(true);
                    hubConnection.current = connection;
                } else {
                    // Component unmounted during connection
                    connection.stop().catch(() => {});
                }
            } catch (err) {
                if (isMounted) {
                    console.error('❌ SignalR connection failed:', err);
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

    const updateCarrierLocation = (location: any) => {
        setActiveCarriers(prev => {
            const index = prev.findIndex(c => c.carrierId === location.carrierId);
            if (index >= 0) {
                const updated = [...prev];
                updated[index] = { ...updated[index], ...location };
                return updated;
            }
            return [...prev, location];
        });

        // Update marker on map
        if (mapInstanceRef.current && location.latitude && location.longitude) {
            updateMarkerOnMap(location);
        }
    };

    const updateMarkerOnMap = (carrier: any) => {
        const L = (window as any).L;
        if (!L || !mapInstanceRef.current) return;

        const marker = markersRef.current.get(carrier.carrierId);
        if (marker) {
            marker.setLatLng([carrier.latitude, carrier.longitude]);
        } else {
            const newMarker = L.marker([carrier.latitude, carrier.longitude], {
                icon: L.divIcon({
                    className: 'carrier-marker',
                    html: `<div style="background:#4f46e5;color:white;padding:8px;border-radius:50%;font-size:16px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🚚</div>`,
                    iconSize: [40, 40],
                    iconAnchor: [20, 40]
                })
            }).addTo(mapInstanceRef.current);
            
            newMarker.bindPopup(`
                <div style="min-width:180px;">
                    <strong>${carrier.carrierName || 'Kurye'}</strong><br/>
                    📍 ${carrier.latitude?.toFixed(4)}, ${carrier.longitude?.toFixed(4)}
                </div>
            `);
            
            markersRef.current.set(carrier.carrierId, newMarker);
        }
    };

    // Load Leaflet and initialize map
    useEffect(() => {
        let isMounted = true;
        let initRetryCount = 0;
        const maxRetries = 5;

        const loadLeaflet = async () => {
            // Add CSS first and wait for it
            if (!document.getElementById('leaflet-css')) {
                const link = document.createElement('link');
                link.id = 'leaflet-css';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
                // Wait for CSS to load
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Load JS if not present
            if (!(window as any).L) {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                    script.async = true;
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error('Failed to load Leaflet'));
                    document.head.appendChild(script);
                });
            }

            // Wait for container to be ready, retry if needed
            const tryInitialize = () => {
                if (!isMounted) return;
                
                if (mapContainerRef.current && (window as any).L) {
                    initializeMap();
                } else if (initRetryCount < maxRetries) {
                    initRetryCount++;
                    setTimeout(tryInitialize, 200);
                }
            };

            tryInitialize();
        };

        loadLeaflet().catch(console.error);

        // Cleanup: destroy map on unmount
        return () => {
            isMounted = false;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            markersRef.current.clear();
        };
    }, []);

    const initializeMap = () => {
        if (mapInstanceRef.current || !mapContainerRef.current) return;
        
        const L = (window as any).L;
        if (!L) return;

        const map = L.map(mapContainerRef.current).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 12);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        mapInstanceRef.current = map;

        // Force recalculate size after a short delay (fixes display issues)
        setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
            }
        }, 100);

        // Add existing carriers to map
        activeCarriers.forEach(carrier => {
            if (carrier.latitude && carrier.longitude) {
                updateMarkerOnMap(carrier);
            }
        });
    };

    // Update map when carriers change
    useEffect(() => {
        if (mapInstanceRef.current && activeCarriers.length > 0) {
            activeCarriers.forEach(carrier => {
                if (carrier.latitude && carrier.longitude) {
                    updateMarkerOnMap(carrier);
                }
            });

            // Center on first carrier with location
            const firstWithLocation = activeCarriers.find(c => c.latitude && c.longitude);
            if (firstWithLocation) {
                mapInstanceRef.current.setView([firstWithLocation.latitude, firstWithLocation.longitude], 13);
            }
        }
    }, [activeCarriers]);

    // Fetch initial data
    useEffect(() => {
        fetchActiveCarriers();
        const interval = setInterval(fetchActiveCarriers, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchActiveCarriers = async () => {
        try {
            const response = await api.get('/api/admin/carriers/active');
            setActiveCarriers(response.data || []);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching carriers:', err);
            if (!activeCarriers.length) {
                setError('Aktif kuryeler yüklenemedi');
            }
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateString: string | null) => {
        if (!dateString) return '-';
        const date = new Date(dateString + (dateString.endsWith('Z') ? '' : 'Z'));
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatDuration = (startTime: string | null | undefined) => {
        if (!startTime) return '-';
        const start = new Date(startTime + (startTime.endsWith('Z') ? '' : 'Z'));
        const now = new Date();
        const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        return `${hours} sa ${minutes} dk`;
    };

    const openGoogleMapsForCarrier = (carrier: ActiveCarrier) => {
        if (carrier.latitude && carrier.longitude) {
            window.open(`https://www.google.com/maps?q=${carrier.latitude},${carrier.longitude}`, '_blank');
        }
    };

    const focusOnCarrier = (carrier: ActiveCarrier) => {
        setSelectedCarrier(carrier);
        if (mapInstanceRef.current && carrier.latitude && carrier.longitude) {
            mapInstanceRef.current.setView([carrier.latitude, carrier.longitude], 15);
            const marker = markersRef.current.get(carrier.carrierId);
            if (marker) marker.openPopup();
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Aktif kuryeler yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>🚚 Canlı Kurye Takibi</h3>
                <div className={styles.headerActions}>
                    <span className={`${styles.connectionStatus} ${connected ? styles.online : styles.offline}`}>
                        {connected ? '🟢 Canlı' : '🔴 Bağlantı Yok'}
                    </span>
                    <span className={styles.count}>{activeCarriers.length} aktif kurye</span>
                    <button onClick={fetchActiveCarriers} className={styles.refreshBtn}>
                        🔄 Yenile
                    </button>
                </div>
            </div>

            {error && (
                <div className={styles.error}>
                    <span>⚠️ {error}</span>
                </div>
            )}

            <div className={styles.content}>
                {/* Map Section */}
                <div className={styles.mapSection}>
                    <div 
                        ref={mapContainerRef} 
                        style={{ height: '400px', width: '100%', borderRadius: '8px' }}
                    />
                </div>

                {/* Carrier List Section */}
                <div className={styles.listSection}>
                    <h4>Mesaideki Kuryeler</h4>
                    
                    {activeCarriers.length === 0 ? (
                        <div className={styles.emptyState}>
                            <span className={styles.emptyIcon}>🌙</span>
                            <p>Şu anda mesaideki kurye bulunmuyor</p>
                        </div>
                    ) : (
                        <div className={styles.carrierList}>
                            {activeCarriers.map(carrier => (
                                <div 
                                    key={carrier.carrierId} 
                                    className={`${styles.carrierCard} ${selectedCarrier?.carrierId === carrier.carrierId ? styles.selected : ''}`}
                                    onClick={() => focusOnCarrier(carrier)}
                                >
                                    <div className={styles.carrierInfo}>
                                        <div className={styles.carrierName}>
                                            <span className={`${styles.statusDot} ${carrier.isOnline ? styles.online : ''}`}></span>
                                            {carrier.carrierName}
                                        </div>
                                        <div className={styles.carrierDetails}>
                                            <span>📧 {carrier.email}</span>
                                        </div>
                                    </div>
                                    
                                    <div className={styles.shiftInfo}>
                                        <div className={styles.shiftTime}>
                                            <span className={styles.label}>Mesai:</span>
                                            <span className={styles.value}>{formatDuration(carrier.shiftStartTime)}</span>
                                        </div>
                                        {carrier.latitude && carrier.longitude ? (
                                            <div className={styles.location}>
                                                <span className={styles.coords}>
                                                    📍 {carrier.latitude.toFixed(4)}, {carrier.longitude.toFixed(4)}
                                                </span>
                                                <span className={styles.updateTime}>
                                                    ({formatTime(carrier.lastLocationUpdate)})
                                                </span>
                                            </div>
                                        ) : (
                                            <div className={styles.noLocation}>
                                                <span>📍 Konum verisi yok</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.actions}>
                                        {carrier.latitude && carrier.longitude && (
                                            <button 
                                                className={styles.mapBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openGoogleMapsForCarrier(carrier);
                                                }}
                                            >
                                                🗺️ Google Maps
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
