// frontend/pharma-desk/src/app/(dashboard)/transferlerim/[transferId]/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ShipmentItem, TrackingEvent } from '@/lib/dashboardData';

// Bileşenleri ve Stilleri import edelim
import SettingsCard from '@/components/settings/SettingsCard';
import '@/app/(dashboard)/dashboard/dashboard.css';
import raporStyles from '@/app/(dashboard)/raporlar/raporDetay.module.css';
import detayStyles from './transferDetay.module.css';

// Tracking bileşenleri
import { useTrackingHub } from '@/hooks/useTrackingHub';

// Dynamic import for SSR-safe Leaflet map
const UserTrackingMap = dynamic(
  () => import('@/components/tracking/UserTrackingMap'),
  { ssr: false, loading: () => <div style={{ height: '300px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Harita yükleniyor...</div> }
);

// Tracking status type
interface TrackingStatus {
  shipmentId: number;
  carrierId: number | null;
  carrierName: string | null;
  carrierPhone: string | null;
  carrierLocation: {
    latitude: number;
    longitude: number;
    lastUpdate: string;
  } | null;
  currentStopCount: number;
  myStopOrder: number;
  remainingStops: number;
  estimatedArrival: string | null;
  shipmentStatus: string;
  isLiveTrackingAvailable: boolean;
}

// İkonlar
const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
const PackageIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const TruckIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>;
const CheckIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const WarehouseIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.636 18.364a9 9 0 1 1 12.728 0M12 12v10m-4-10v10m8-10v10M2 12h20M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>;


export default function TransferDetayPage() {
  const params = useParams();
  const { transferId } = params as { transferId: string };

  const [shipment, setShipment] = useState<ShipmentItem | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  
  // ═══════════════════════════════════════════════════════════════
  // TRACKING STATE
  // ═══════════════════════════════════════════════════════════════
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  
  // Eczane konumu (teslimat adresi) - şimdilik mock, gerçek implementasyonda API'den gelecek
  const pharmacyLocation = useMemo(() => {
    // TODO: Bu bilgi API'den shipment detaylarıyla birlikte gelmeli
    // Şimdilik kurye konumunun yakınında bir mock konum kullanalım
    if (trackingStatus?.carrierLocation) {
      return {
        latitude: trackingStatus.carrierLocation.latitude + 0.008, // Yaklaşık 800m ileride
        longitude: trackingStatus.carrierLocation.longitude + 0.005,
        name: shipment?.counterparty || 'Eczane'
      };
    }
    return null;
  }, [trackingStatus?.carrierLocation, shipment?.counterparty]);
  
  // SignalR hook for real-time updates (only enabled when Rule of 5 applies)
  // Pass initial location from API so marker shows immediately
  const { carrierLocation: liveLocation, connected: signalRConnected } = useTrackingHub({
    shipmentId: trackingStatus?.shipmentId || 0,
    carrierId: trackingStatus?.carrierId || null,
    enabled: trackingStatus?.isLiveTrackingAvailable || false,
    initialLocation: trackingStatus?.carrierLocation || null
  });

  // Fetch shipment data from API
  useEffect(() => {
    const fetchShipment = async () => {
      try {
        const token = localStorage.getItem('token');
        const API_BASE_URL = '';
        const response = await fetch(`${API_BASE_URL}/api/shipments/${transferId}`, {
          credentials: 'include',
          headers: token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (response.ok) {
          const data = await response.json();
          // Map API response to ShipmentItem format
          const mappedShipment: ShipmentItem = {
            id: data.id,
            orderNumber: data.orderNumber || `ORD-${data.id}`,
            productName: data.productName || 'Bilinmiyor',
            quantity: data.quantity || 1,
            trackingNumber: data.trackingNumber || 'N/A',
            date: data.updatedAt || data.createdAt || new Date().toISOString(),
            transferType: data.transferType || 'outbound',
            counterparty: data.counterpartyName || data.counterparty || 'Bilinmiyor',
            shippingProvider: data.shippingProvider || 'Bilinmiyor',
            status: data.status || 'pending',
            trackingHistory: data.trackingHistory || []
          };
          setShipment(mappedShipment);
          
          // ═══════════════════════════════════════════════════════════
          // TRACKING: Fetch if status is in_transit (shipped, 1, in_transit, InTransit)
          // ═══════════════════════════════════════════════════════════
          const statusStr = String(data.status).toLowerCase();
          if (statusStr === 'shipped' || statusStr === 'in_transit' || statusStr === '1' || statusStr === 'intransit') {
            fetchTrackingStatus(data.id, token);
          }
        } else if (response.status === 404) {
          setShipment(null);
        } else {
          setError('Transfer detayları yüklenemedi');
          setShipment(null);
        }
      } catch (err) {
        console.error('Shipment fetch error:', err);
        setError('Bir hata oluştu');
        setShipment(null);
      }
    };
    
    fetchShipment();
  }, [transferId]);

  // ═══════════════════════════════════════════════════════════════
  // TRACKING STATUS FETCH
  // ═══════════════════════════════════════════════════════════════
  const fetchTrackingStatus = async (shipmentId: number, token: string | null) => {
    setTrackingLoading(true);
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/tracking-status`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setTrackingStatus(data);
      } else {
        console.log('Tracking status not available:', response.status);
      }
    } catch (err) {
      console.error('Tracking status fetch error:', err);
    } finally {
      setTrackingLoading(false);
    }
  };

  // Duruma göre ikon döndüren yardımcı fonksiyon
  const getIconForEvent = (status: string) => {
    if (status.includes('Teslim Edildi')) return <CheckIcon />;
    if (status.includes('Dağıtımda')) return <TruckIcon />;
    if (status.includes('Kargoya Verildi')) return <WarehouseIcon />;
    return <PackageIcon />;
  };

  // Kargo durumuna göre zaman çizelgesindeki aktif adımı belirle
  const activeStepIndex = useMemo(() => {
    if (!shipment?.trackingHistory) return 0;
    return shipment.trackingHistory.length - 1;
  }, [shipment]);

  // Check if shipment is in transit
  const isInTransit = useMemo(() => {
    if (!shipment) return false;
    const status = String(shipment.status).toLowerCase();
    // shipped = InTransit (status 1), in_transit, intransit are all valid
    return status === 'in_transit' || status === '1' || status === 'intransit' || status === 'shipped';
  }, [shipment]);

  // Get status badge info
  const getStatusBadge = () => {
    if (!shipment) return { text: 'Bilinmiyor', color: '#6b7280', icon: '📦' };
    const status = String(shipment.status).toLowerCase();
    if (status === 'delivered' || status === '3') return { text: 'Teslim Edildi', color: '#10b981', icon: '✅' };
    if (status === 'in_transit' || status === '2' || status === 'intransit') return { text: 'Yolda', color: '#f59e0b', icon: '🚚' };
    if (status === 'shipped' || status === '1') return { text: 'Kargoda', color: '#3b82f6', icon: '📦' };
    if (status === 'pending' || status === '0') return { text: 'Hazırlanıyor', color: '#6366f1', icon: '⏳' };
    if (status === 'cancelled') return { text: 'İptal', color: '#ef4444', icon: '❌' };
    return { text: status, color: '#6b7280', icon: '📦' };
  };

  const statusBadge = getStatusBadge();

  if (shipment === undefined) {
    return <div>Yükleniyor...</div>;
  }

  if (shipment === null) {
    return <div>Transfer detayı bulunamadı.</div>;
  }

  // Alış/Satış durumuna göre etiketleri belirle
  const isOutbound = shipment.transferType === 'outbound';
  const counterpartyLabel = isOutbound ? "Alıcı Eczane" : "Gönderici Eczane";

  return (
    <div className={raporStyles.pageContainer}>
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER - Tek başlık */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className={raporStyles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 className={raporStyles.pageTitle}>
            📦 Teslimat Detayı
          </h1>
          <span 
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px', 
              borderRadius: '20px', 
              backgroundColor: statusBadge.color + '20',
              color: statusBadge.color,
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            <span>{statusBadge.icon}</span>
            {statusBadge.text}
          </span>
        </div>
        <Link href="/transferlerim" className={raporStyles.backButton}>
          <BackIcon />
          <span>Tüm Transferler</span>
        </Link>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MAIN GRID - 2 sütun */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className={detayStyles.detailGrid}>
        
        {/* SOL SÜTUN: Sipariş Bilgileri */}
        <SettingsCard
          title="Sipariş Detayları"
          description={`Sipariş No: ${shipment.orderNumber}`}
        >
          <div className={detayStyles.infoList}>
            <div className={detayStyles.infoItem}>
              <span className={detayStyles.infoLabel}>Ürün Adı</span>
              <span className={detayStyles.infoValue}>{shipment.productName}</span>
            </div>
            
            <div className={detayStyles.infoItem}>
              <span className={detayStyles.infoLabel}>Adet</span>
              <span className={detayStyles.infoValue}>{shipment.quantity} adet</span>
            </div>

            <div className={detayStyles.infoItem}>
              <span className={detayStyles.infoLabel}>{counterpartyLabel}</span>
              <span className={detayStyles.infoValue}>{shipment.counterparty}</span>
            </div>
            <div className={detayStyles.infoItem}>
              <span className={detayStyles.infoLabel}>Kargo Firması</span>
              <span className={detayStyles.infoValue}>{shipment.shippingProvider}</span>
            </div>
            <div className={detayStyles.infoItem}>
              <span className={detayStyles.infoLabel}>Takip Numarası</span>
              <span className={detayStyles.infoValue}>{shipment.trackingNumber}</span>
            </div>
             <div className={detayStyles.infoItem}>
              <span className={detayStyles.infoLabel}>Son Güncelleme</span>
              <span className={detayStyles.infoValue}>{formatDate(shipment.date)}</span>
            </div>

            {/* Kurye Bilgisi - eğer varsa */}
            {trackingStatus?.carrierName && (
              <>
                <div className={detayStyles.infoDivider}></div>
                <div className={detayStyles.infoItem}>
                  <span className={detayStyles.infoLabel}>🚚 Kurye</span>
                  <span className={detayStyles.infoValue}>{trackingStatus.carrierName}</span>
                </div>
                {trackingStatus.carrierPhone && (
                  <div className={detayStyles.infoItem}>
                    <span className={detayStyles.infoLabel}>📱 Telefon</span>
                    <a href={`tel:${trackingStatus.carrierPhone}`} className={detayStyles.infoValue} style={{ color: '#3b82f6' }}>
                      {trackingStatus.carrierPhone}
                    </a>
                  </div>
                )}
                {trackingStatus.estimatedArrival && (
                  <div className={detayStyles.infoItem}>
                    <span className={detayStyles.infoLabel}>⏱️ Tahmini Varış</span>
                    <span className={detayStyles.infoValue} style={{ fontWeight: 600, color: '#10b981' }}>
                      ~{trackingStatus.estimatedArrival}
                    </span>
                  </div>
                )}
                {trackingStatus.remainingStops > 0 && (
                  <div className={detayStyles.infoItem}>
                    <span className={detayStyles.infoLabel}>📍 Sıra</span>
                    <span className={detayStyles.infoValue}>
                      Önünüzde {trackingStatus.remainingStops} teslimat var
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </SettingsCard>

        {/* SAĞ SÜTUN: Kargo Geçmişi + Harita */}
        <div className={detayStyles.rightColumn}>
          {/* Kargo Geçmişi */}
          <SettingsCard
            title="Kargo Geçmişi"
            description="Siparişinizin takip durumu"
          >
            <div className={detayStyles.trackingTimeline}>
              {shipment.trackingHistory && shipment.trackingHistory.map((event, index) => (
                <div
                  key={index}
                  className={`
                    ${detayStyles.timelineItem} 
                    ${index === activeStepIndex ? detayStyles.active : ''} 
                    ${index < activeStepIndex ? detayStyles.completed : ''}
                  `}
                >
                  <div className={detayStyles.timelineIcon}>
                    {getIconForEvent(event.status)}
                  </div>
                  <div className={detayStyles.timelineContent}>
                    <strong>{event.status}</strong>
                    <span>{formatEventDate(event.date)}</span>
                    <p>{event.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </SettingsCard>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* HARİTA veya SIRA BİLGİSİ - Rule of 5 */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {isInTransit && trackingStatus && (
            <div className={detayStyles.mapSection}>
              {/* CANLI TAKİP - Sadece ilk 5 sıradaki eczaneler için */}
              {trackingStatus.isLiveTrackingAvailable ? (
                <>
                  <div className={detayStyles.mapHeader}>
                    <h3>
                      📍 Canlı Konum Takibi
                    </h3>
                    <div className={detayStyles.headerRight}>
                      {(liveLocation || trackingStatus.carrierLocation) && (
                        <span className={detayStyles.lastUpdateText}>
                          Son güncelleme: {new Date((liveLocation || trackingStatus.carrierLocation)!.lastUpdate).toLocaleTimeString('tr-TR')}
                        </span>
                      )}
                      <span className={detayStyles.connectionStatus}>
                        <span className={`${detayStyles.statusDot} ${signalRConnected ? detayStyles.connected : ''}`}></span>
                        {signalRConnected ? 'Canlı' : 'Bağlanıyor...'}
                      </span>
                    </div>
                  </div>
                  
                  {trackingLoading ? (
                    <div className={detayStyles.mapLoading}>
                      <div className={detayStyles.spinner}></div>
                      <p>Konum yükleniyor...</p>
                    </div>
                  ) : (
                    <UserTrackingMap 
                      carrierId={trackingStatus.carrierId}
                      carrierLocation={liveLocation || trackingStatus.carrierLocation}
                      carrierName={trackingStatus.carrierName || 'Kurye'}
                      pharmacyLocation={pharmacyLocation}
                    />
                  )}
                </>
              ) : (
                /* SIRA BİLGİSİ - İlk 5'te olmayan eczaneler için */
                <div className={detayStyles.queueInfoPanel}>
                  <div className={detayStyles.queueIcon}>📦</div>
                  <h4>Siparişiniz Yolda</h4>
                  <p className={detayStyles.queueNumber}>
                    Önünüzde <strong>{trackingStatus.remainingStops}</strong> teslimat var
                  </p>
                  
                  {/* Progress Bar */}
                  <div className={detayStyles.queueProgress}>
                    <div 
                      className={detayStyles.queueProgressBar}
                      style={{ width: `${Math.max(5, Math.min(95, (1 - trackingStatus.remainingStops / 20) * 100))}%` }}
                    />
                  </div>
                  
                  <p className={detayStyles.queueNote}>
                    Sıranız yaklaştığında (son 5 teslimat) canlı konum takibi aktif olacaktır.
                  </p>
                  
                  {trackingStatus.estimatedArrival && (
                    <p className={detayStyles.queueEta}>
                      Tahmini varış: <strong>~{trackingStatus.estimatedArrival}</strong>
                    </p>
                  )}
                  
                  {trackingStatus.carrierName && (
                    <p className={detayStyles.queueCarrier}>
                      🚚 Kurye: {trackingStatus.carrierName}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Tarihi formatlamak için
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('tr-TR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// Event tarihi için kısa format
const formatEventDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('tr-TR', { 
    day: '2-digit', 
    month: 'short',
    hour: '2-digit', 
    minute: '2-digit' 
  });
};