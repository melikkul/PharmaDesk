// frontend/pharma-desk/src/app/(dashboard)/transferlerim/[transferId]/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ShipmentItem, TrackingEvent } from '@/lib/dashboardData';

// Bileşenleri ve Stilleri import edelim
import SettingsCard from '@/components/settings/SettingsCard';
import '@/app/(dashboard)/dashboard/dashboard.css';
import raporStyles from '@/app/(dashboard)/raporlar/raporDetay.module.css'; // Geri butonu ve başlık için
import detayStyles from './transferDetay.module.css'; // Bu sayfaya özel stiller

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
          setShipment({
            id: data.id,
            orderNumber: data.orderNumber || `ORD-${data.id}`,
            productName: data.productName || 'Bilinmiyor',
            quantity: data.quantity || 1,
            trackingNumber: data.trackingNumber || 'N/A',
            date: data.updatedAt || data.createdAt || new Date().toISOString(),
            transferType: data.transferType || 'outbound',
            counterparty: data.counterpartyName || 'Bilinmiyor',
            shippingProvider: data.shippingProvider || 'Bilinmiyor',
            status: data.status || 'pending',
            trackingHistory: data.trackingHistory || []
          });
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

  if (shipment === undefined) {
    return <div>Yükleniyor...</div>;
  }

  if (shipment === null) {
    return <div>Transfer detayı bulunamadı.</div>;
  }

  // Alış/Satış durumuna göre etiketleri belirle
  const isOutbound = shipment.transferType === 'outbound';
  const counterpartyLabel = isOutbound ? "Alıcı Eczane" : "Gönderici Eczane";
  const statusLabel = isOutbound ? "Giden Kargo" : "Gelen Kargo";

  return (
    <div className={raporStyles.pageContainer}>
      <div className={raporStyles.pageHeader}>
        <h1 className={raporStyles.pageTitle}>Kargo Takip Detayı</h1>
        <Link href="/transferlerim" className={raporStyles.backButton}>
          <BackIcon />
          <span>Tüm Transferlere Geri Dön</span>
        </Link>
      </div>

      <div className={detayStyles.detailGrid}>
        {/* Sol Sütun: Sipariş Bilgileri */}
        <SettingsCard
          title={statusLabel}
          description={`Sipariş No: ${shipment.orderNumber}`}
        >
          <div className={detayStyles.infoList}>
            <div className={detayStyles.infoItem}>
              <span className={detayStyles.infoLabel}>Ürün Adı</span>
              <span className={detayStyles.infoValue}>{shipment.productName}</span>
            </div>
            
            {/* ----- YENİ EKLENEN SATIR ----- */}
            <div className={detayStyles.infoItem}>
              <span className={detayStyles.infoLabel}>Adet</span>
              <span className={detayStyles.infoValue}>{shipment.quantity} adet</span>
            </div>
            {/* ----- YENİ SATIR SONU ----- */}

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
          </div>
        </SettingsCard>

        {/* Sağ Sütun: Kargo Geçmişi */}
        <SettingsCard
          title="Kargo Geçmişi"
          description="Siparişinizin anlık durumunu takip edin."
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
                  <span>{event.date}</span>
                  <p>{event.location}</p>
                </div>
              </div>
            ))}
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}

// Tarihi formatlamak için (kopyalandı)
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