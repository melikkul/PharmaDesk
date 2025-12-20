'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './UserTrackingMap.module.css';

interface CarrierLocation {
    latitude: number;
    longitude: number;
    lastUpdate: string;
}

interface PharmacyLocation {
    latitude: number;
    longitude: number;
    name: string;
}

interface UserTrackingMapProps {
    carrierId: number | null;
    carrierLocation: CarrierLocation | null;
    carrierName?: string;
    /** Teslimat adresi - haritada eczane ikonu olarak gösterilir */
    pharmacyLocation?: PharmacyLocation | null;
    onLocationUpdate?: (location: CarrierLocation) => void;
}

// Default center: Ankara, Turkey
const DEFAULT_CENTER = { lat: 39.9334, lng: 32.8597 };

/**
 * UserTrackingMap - Read-only tracking map for pharmacy users
 * Features:
 * - SSR-safe Leaflet loading
 * - Custom marker icons
 * - OSRM routing (actual road paths)
 * - Auto-fit bounds
 */
export default function UserTrackingMap({ 
    carrierId, 
    carrierLocation, 
    carrierName = 'Kurye',
    pharmacyLocation,
    onLocationUpdate 
}: UserTrackingMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const carrierMarkerRef = useRef<any>(null);
    const pharmacyMarkerRef = useRef<any>(null);
    const routeLineRef = useRef<any>(null);
    const [mapReady, setMapReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load Leaflet dynamically (SSR-safe)
    useEffect(() => {
        let isMounted = true;

        const loadLeaflet = async () => {
            try {
                // Load CSS
                if (!document.getElementById('leaflet-css')) {
                    const link = document.createElement('link');
                    link.id = 'leaflet-css';
                    link.rel = 'stylesheet';
                    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                    link.crossOrigin = '';
                    document.head.appendChild(link);
                    await new Promise(resolve => setTimeout(resolve, 150));
                }

                // Load JS
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

                if (isMounted) {
                    setMapReady(true);
                }
            } catch (err) {
                if (isMounted) {
                    setError('Harita yüklenemedi');
                    console.error('Leaflet load error:', err);
                }
            }
        };

        loadLeaflet();
        return () => { isMounted = false; };
    }, []);

    // Initialize map
    useEffect(() => {
        if (!mapReady || !mapContainerRef.current || mapInstanceRef.current) return;

        const L = (window as any).L;
        if (!L) return;

        const initialCenter = carrierLocation 
            ? [carrierLocation.latitude, carrierLocation.longitude]
            : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];

        const map = L.map(mapContainerRef.current, {
            zoomControl: true,
            scrollWheelZoom: true,
            dragging: true,
            tap: true
        }).setView(initialCenter, 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(map);

        mapInstanceRef.current = map;

        setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
            }
        }, 100);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
            carrierMarkerRef.current = null;
            pharmacyMarkerRef.current = null;
            routeLineRef.current = null;
        };
    }, [mapReady]);

    // Create carrier icon
    const createCarrierIcon = (L: any) => {
        return L.divIcon({
            className: styles.carrierMarker,
            html: `
                <div class="${styles.markerIconWrapper}">
                    <div class="${styles.markerIcon}">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 8H17V4H3C1.9 4 1 4.9 1 6V17H3C3 18.66 4.34 20 6 20C7.66 20 9 18.66 9 17H15C15 18.66 16.34 20 18 20C19.66 20 21 18.66 21 17H23V12L20 8ZM6 18.5C5.17 18.5 4.5 17.83 4.5 17C4.5 16.17 5.17 15.5 6 15.5C6.83 15.5 7.5 16.17 7.5 17C7.5 17.83 6.83 18.5 6 18.5ZM19.5 9.5L21.46 12H17V9.5H19.5ZM18 18.5C17.17 18.5 16.5 17.83 16.5 17C16.5 16.17 17.17 15.5 18 15.5C18.83 15.5 19.5 16.17 19.5 17C19.5 17.83 18.83 18.5 18 18.5Z" fill="white"/>
                        </svg>
                    </div>
                    <div class="${styles.markerPulse}"></div>
                </div>
            `,
            iconSize: [56, 56],
            iconAnchor: [28, 56],
            popupAnchor: [0, -56]
        });
    };

    // Create pharmacy icon
    const createPharmacyIcon = (L: any) => {
        return L.divIcon({
            className: styles.pharmacyMarker,
            html: `
                <div class="${styles.pharmacyIconWrapper}">
                    <div class="${styles.pharmacyIcon}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM17 13H13V17H11V13H7V11H11V7H13V11H17V13Z" fill="white"/>
                        </svg>
                    </div>
                </div>
            `,
            iconSize: [44, 44],
            iconAnchor: [22, 44],
            popupAnchor: [0, -44]
        });
    };

    // Fit map bounds to show both markers
    const fitMapBounds = () => {
        if (!mapInstanceRef.current) return;
        
        const L = (window as any).L;
        if (!L) return;

        const points: [number, number][] = [];
        
        if (carrierLocation) {
            points.push([carrierLocation.latitude, carrierLocation.longitude]);
        }
        
        if (pharmacyLocation) {
            points.push([pharmacyLocation.latitude, pharmacyLocation.longitude]);
        }

        if (points.length >= 2) {
            const bounds = L.latLngBounds(points);
            mapInstanceRef.current.fitBounds(bounds, { 
                padding: [50, 50],
                maxZoom: 15 
            });
        } else if (points.length === 1) {
            mapInstanceRef.current.setView(points[0], 14);
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // OSRM ROUTING - Gerçek yol üzerinden rota çizimi
    // ═══════════════════════════════════════════════════════════════
    const fetchRoute = async (from: [number, number], to: [number, number]) => {
        try {
            // OSRM public demo server (ücretsiz, API key gerektirmez)
            const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
                // GeoJSON coordinates are [lng, lat], convert to [lat, lng] for Leaflet
                const coordinates = data.routes[0].geometry.coordinates.map(
                    (coord: [number, number]) => [coord[1], coord[0]]
                );
                return coordinates;
            }
        } catch (err) {
            console.warn('OSRM routing failed, falling back to straight line:', err);
        }
        
        // Fallback: düz çizgi
        return [from, to];
    };

    // Update carrier marker
    useEffect(() => {
        if (!mapInstanceRef.current || !carrierLocation) return;

        const L = (window as any).L;
        if (!L) return;

        const position: [number, number] = [carrierLocation.latitude, carrierLocation.longitude];

        if (carrierMarkerRef.current) {
            carrierMarkerRef.current.setLatLng(position);
        } else {
            const marker = L.marker(position, {
                icon: createCarrierIcon(L),
                zIndexOffset: 1000
            }).addTo(mapInstanceRef.current);

            marker.bindPopup(`
                <div class="${styles.popup}">
                    <strong>🚚 ${carrierName}</strong><br/>
                    <span style="font-size: 12px; color: #6b7280;">
                        Son güncelleme: ${new Date(carrierLocation.lastUpdate).toLocaleTimeString('tr-TR')}
                    </span>
                </div>
            `);

            carrierMarkerRef.current = marker;
        }

        fitMapBounds();
    }, [carrierLocation, carrierName]);

    // Update pharmacy marker and route
    useEffect(() => {
        if (!mapInstanceRef.current || !pharmacyLocation) return;

        const L = (window as any).L;
        if (!L) return;

        const position: [number, number] = [pharmacyLocation.latitude, pharmacyLocation.longitude];

        if (pharmacyMarkerRef.current) {
            pharmacyMarkerRef.current.setLatLng(position);
        } else {
            const marker = L.marker(position, {
                icon: createPharmacyIcon(L)
            }).addTo(mapInstanceRef.current);

            marker.bindPopup(`
                <div class="${styles.popup}">
                    <strong>🏥 ${pharmacyLocation.name}</strong><br/>
                    <span style="font-size: 12px; color: #6b7280;">Teslimat Adresi</span>
                </div>
            `);

            pharmacyMarkerRef.current = marker;
        }

        // Draw route if both locations exist
        if (carrierLocation && pharmacyLocation) {
            const carrierPos: [number, number] = [carrierLocation.latitude, carrierLocation.longitude];
            const pharmacyPos: [number, number] = [pharmacyLocation.latitude, pharmacyLocation.longitude];
            
            // Fetch actual road route
            fetchRoute(carrierPos, pharmacyPos).then(routeCoords => {
                if (!mapInstanceRef.current) return;
                
                if (routeLineRef.current) {
                    routeLineRef.current.setLatLngs(routeCoords);
                } else {
                    const routeLine = L.polyline(routeCoords, {
                        color: '#3b82f6',
                        weight: 4,
                        opacity: 0.8,
                        lineCap: 'round',
                        lineJoin: 'round'
                    }).addTo(mapInstanceRef.current);
                    
                    routeLineRef.current = routeLine;
                }
            });
        }

        fitMapBounds();
    }, [pharmacyLocation, carrierLocation]);

    // Error state
    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <span>⚠️ {error}</span>
                </div>
            </div>
        );
    }

    // Loading state
    if (!mapReady) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Harita yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Harita */}
            <div 
                ref={mapContainerRef} 
                className={styles.mapContainer}
            />
        </div>
    );
}
