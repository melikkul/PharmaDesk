'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/store/AuthContext';
import { orderService } from '@/services/orderService';
import { Order } from '@/types';
import styles from './orderDetail.module.css';
import TrackingStatusCard from '@/components/tracking/TrackingStatusCard';
import { useTrackingHub } from '@/hooks/useTrackingHub';

// Dynamic import for SSR-safe Leaflet map
const UserTrackingMap = dynamic(
  () => import('@/components/tracking/UserTrackingMap'),
  { ssr: false, loading: () => <div className={styles.mapLoading}>Harita yükleniyor...</div> }
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

const KDV_RATE = 0.10;

const normalizeTurkish = (text: string): string => {
  if (!text) return '-';
  return text
    .replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ı/g, 'i').replace(/İ/g, 'I')
    .replace(/₺/g, 'TL');
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };
  const { token } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  
  // Tracking state
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  
  // SignalR hook for real-time updates (only enabled when Rule of 5 applies)
  const { carrierLocation: liveLocation, connected: signalRConnected } = useTrackingHub({
    shipmentId: trackingStatus?.shipmentId || 0,
    carrierId: trackingStatus?.carrierId || null,
    enabled: trackingStatus?.isLiveTrackingAvailable || false
  });

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    fetchOrderDetail();
  }, [token, id]);
  
  // Fetch tracking status when order is in transit
  useEffect(() => {
    if (order && (order as any).shipmentId && order.status?.toLowerCase().includes('transit')) {
      fetchTrackingStatus((order as any).shipmentId);
    }
  }, [order]);

  const fetchOrderDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) throw new Error('Token not found');
      const data = await orderService.getOrderById(token, id);
      setOrder(data);
    } catch (err) {
      console.error('Order detail fetch error:', err);
      setError('Sipariş detayı yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTrackingStatus = async (shipmentId: number) => {
    setTrackingLoading(true);
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/tracking-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTrackingStatus(data);
      }
    } catch (err) {
      console.error('Tracking status fetch error:', err);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!order) return;
    setPdfLoading(true);

    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const orderData = order as any;
      const pw = 210; // A4 genişlik
      const ph = 297; // A4 yükseklik
      const n = normalizeTurkish;
      const margin = 15;
      
      const subtotal = order.orderItems?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) || 0;
      const kdvTotal = subtotal * KDV_RATE;
      const grandTotal = subtotal + kdvTotal;
      const fmt = (num: number) => num.toFixed(2).replace('.', ',') + ' TL';

      // Logo yükle ve orantıyı koru
      const loadLogo = (): Promise<{data: string, width: number, height: number}> => new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          canvas.getContext('2d')?.drawImage(img, 0, 0);
          resolve({
            data: canvas.toDataURL('image/png'),
            width: img.width,
            height: img.height
          });
        };
        img.onerror = () => resolve({data: '', width: 0, height: 0});
        img.src = '/logoYesil.png';
      });

      const logo = await loadLogo();
      let y = margin;

      // ═══════════════════════════════════════════════════════════════
      // HEADER
      // ═══════════════════════════════════════════════════════════════
      
      // Logo (orantılı boyut)
      if (logo.data) {
        const logoHeight = 15;
        const logoWidth = (logo.width / logo.height) * logoHeight;
        doc.addImage(logo.data, 'PNG', margin, y, logoWidth, logoHeight);
      }
      
      // FATURA başlığı (ortada)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(30, 64, 175);
      doc.text('FATURA', pw / 2, y + 9, { align: 'center' });
      
      // Fatura No ve Tarih (sağda, kutu içinde) - daha geniş kutu
      const infoBoxWidth = 65;
      const infoBoxHeight = 22;
      const infoBoxX = pw - margin - infoBoxWidth;
      
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(infoBoxX, y - 2, infoBoxWidth, infoBoxHeight, 2, 2, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(infoBoxX, y - 2, infoBoxWidth, infoBoxHeight, 2, 2, 'S');
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100);
      doc.text('Fatura No:', infoBoxX + 3, y + 5);
      doc.text('Tarih:', infoBoxX + 3, y + 13);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(40);
      doc.text(order.orderNumber || '-', infoBoxX + infoBoxWidth - 3, y + 5, { align: 'right' });
      doc.text(order.orderDate || '-', infoBoxX + infoBoxWidth - 3, y + 13, { align: 'right' });
      
      y += 22;
      
      // Mavi çizgi
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.8);
      doc.line(margin, y, pw - margin, y);
      
      y += 10;

      // ═══════════════════════════════════════════════════════════════
      // SATICI VE ALICI KUTULARI
      // ═══════════════════════════════════════════════════════════════
      
      const boxWidth = (pw - margin * 2 - 8) / 2;
      const boxHeight = 38;
      
      // SATICI kutusu
      doc.setFillColor(250, 251, 252);
      doc.roundedRect(margin, y, boxWidth, boxHeight, 3, 3, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, boxWidth, boxHeight, 3, 3, 'S');
      
      // Başlık şeridi
      doc.setFillColor(30, 64, 175);
      doc.rect(margin, y, boxWidth, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255);
      doc.text('SATICI', margin + 4, y + 5);
      
      // İçerik
      doc.setTextColor(30);
      doc.setFontSize(10);
      doc.text(n(orderData.sellerPharmacyName || '-'), margin + 4, y + 14);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(80);
      doc.text(`VKN: ${orderData.sellerTaxNumber || '-'}  |  V.D.: ${n(orderData.sellerTaxOffice || '-')}`, margin + 4, y + 21);
      doc.text(`GLN: ${orderData.sellerGLN || '-'}`, margin + 4, y + 27);
      doc.text(`Tel: ${orderData.sellerPhone || '-'}`, margin + 4, y + 33);
      
      // ALICI kutusu
      const aliciX = margin + boxWidth + 8;
      doc.setFillColor(250, 251, 252);
      doc.roundedRect(aliciX, y, boxWidth, boxHeight, 3, 3, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.roundedRect(aliciX, y, boxWidth, boxHeight, 3, 3, 'S');
      
      // Başlık şeridi
      doc.setFillColor(16, 185, 129);
      doc.rect(aliciX, y, boxWidth, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255);
      doc.text('ALICI', aliciX + 4, y + 5);
      
      // İçerik
      doc.setTextColor(30);
      doc.setFontSize(10);
      doc.text(n(orderData.buyerPharmacyName || '-'), aliciX + 4, y + 14);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(80);
      doc.text(`VKN: ${orderData.buyerTaxNumber || '-'}  |  V.D.: ${n(orderData.buyerTaxOffice || '-')}`, aliciX + 4, y + 21);
      doc.text(`GLN: ${orderData.buyerGLN || '-'}`, aliciX + 4, y + 27);
      doc.text(`Tel: ${orderData.buyerPhone || '-'}`, aliciX + 4, y + 33);
      
      y += boxHeight + 10;

      // ═══════════════════════════════════════════════════════════════
      // ÜRÜNLER TABLOSU
      // ═══════════════════════════════════════════════════════════════
      
      const tableData = order.orderItems?.map((item, i) => {
        const t = item.quantity * item.unitPrice;
        const k = t * KDV_RATE;
        return [
          String(i + 1),
          n((item as any).medicationName || '-'),
          String(item.quantity),
          fmt(item.unitPrice),
          fmt(t),
          '%10',
          fmt(k),
          fmt(t + k)
        ];
      }) || [];

      autoTable(doc, {
        startY: y,
        head: [['#', 'Urun Adi', 'Adet', 'Birim', 'Tutar', 'KDV', 'KDV Tut.', 'Toplam']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 2,
          minCellHeight: 6
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [40, 40, 40],
          cellPadding: 2,
          minCellHeight: 6,
          lineColor: [220, 220, 220],
          lineWidth: 0.2
        },
        alternateRowStyles: {
          fillColor: [250, 251, 252]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { halign: 'left', cellWidth: 'auto' },
          2: { halign: 'center', cellWidth: 14 },
          3: { halign: 'right', cellWidth: 20 },
          4: { halign: 'right', cellWidth: 20 },
          5: { halign: 'center', cellWidth: 12 },
          6: { halign: 'right', cellWidth: 18 },
          7: { halign: 'right', cellWidth: 22 }
        },
        margin: { left: margin, right: margin },
        tableWidth: 'auto',
        styles: {
          overflow: 'linebreak',
          font: 'helvetica',
          cellWidth: 'wrap'
        }
      });

      // ═══════════════════════════════════════════════════════════════
      // FOOTER
      // ═══════════════════════════════════════════════════════════════
      
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(margin, ph - 18, pw - margin, ph - 18);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120);
      doc.text(`Durum: ${n(order.status)} | Odeme: ${n(order.paymentStatus)}`, margin, ph - 12);
      doc.text('PharmaDesk | ' + new Date().toLocaleDateString('tr-TR'), pw - margin, ph - 12, { align: 'right' });

      doc.save(`fatura-${order.orderNumber}.pdf`);
    } catch (err) {
      console.error('PDF hatası:', err);
      alert('PDF oluşturulurken hata oluştu.');
    } finally {
      setPdfLoading(false);
    }
  };

  const formatCurrency = (n: number) => n.toFixed(2).replace('.', ',') + ' ₺';

  if (loading) return <div className={styles.container}><div className={styles.loading}>Yükleniyor...</div></div>;
  if (error || !order) return (
    <div className={styles.container}>
      <div className={styles.error}>{error || 'Sipariş bulunamadı'}</div>
      <button onClick={() => router.back()} className={styles.backButton}>Geri Dön</button>
    </div>
  );

  const orderData = order as any;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>← Siparişlere Dön</button>
        <h1>Sipariş Detayı</h1>
        <button onClick={handleDownloadPdf} className={styles.downloadButton} disabled={pdfLoading}>
          {pdfLoading ? '⏳ Oluşturuluyor...' : '📄 Fatura İndir'}
        </button>
      </div>

      <div className={styles.invoiceContainer}>
        <div className={styles.card}>
          <h2>Sipariş Bilgileri</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}><span className={styles.label}>Sipariş No:</span><span className={styles.value}>{order.orderNumber}</span></div>
            <div className={styles.infoItem}><span className={styles.label}>Tarih:</span><span className={styles.value}>{order.orderDate}</span></div>
            <div className={styles.infoItem}><span className={styles.label}>Durum:</span><span className={`${styles.value} ${styles.status}`}>{order.status}</span></div>
            <div className={styles.infoItem}><span className={styles.label}>Ödeme Durumu:</span><span className={styles.value}>{order.paymentStatus}</span></div>
          </div>
        </div>

        <div className={styles.partiesSection}>
          <div className={styles.partyCard}><h3 className={styles.partyTitle}>Satıcı Eczane</h3><p className={styles.partyName}>{orderData.sellerPharmacyName || '-'}</p></div>
          <div className={styles.partyCard}><h3 className={styles.partyTitle}>Alıcı Eczane</h3><p className={styles.partyName}>{orderData.buyerPharmacyName || '-'}</p></div>
        </div>

        <div className={styles.productsSection}>
          <h3 className={styles.sectionTitle}>Sipariş Ürünleri</h3>
          <table className={styles.invoiceTable}>
            <thead><tr><th>Ürün</th><th className={styles.numericCol}>Miktar</th><th className={styles.numericCol}>Birim Fiyat</th><th className={styles.numericCol}>Toplam</th><th className={styles.numericCol}>Kar</th></tr></thead>
            <tbody>
              {order.orderItems?.map((item, i) => (
                <tr key={item.id || i}>
                  <td><a href={`/ilaclar/${item.medicationId}`} className={styles.productLink}>{(item as any).medicationName || '-'}</a></td>
                  <td className={styles.numericCol}>{item.quantity}</td>
                  <td className={styles.numericCol}>{formatCurrency(item.unitPrice)}</td>
                  <td className={styles.numericCol}>{formatCurrency(item.quantity * item.unitPrice)}</td>
                  <td className={styles.numericCol} style={{ color: (item.profitAmount || 0) > 0 ? '#16a34a' : 'inherit' }}>
                    {(item.profitAmount || 0) > 0 ? `+${formatCurrency(item.profitAmount || 0)}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={4} className={styles.totalLabel}>Genel Toplam</td><td className={styles.totalValue}>{formatCurrency(order.totalAmount)}</td></tr></tfoot>
          </table>
        </div>
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* KARGO TAKİP BÖLÜMÜ (Rule of 5 Visibility) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {trackingStatus && (
          <div className={styles.trackingSection}>
            <h3 className={styles.sectionTitle}>📦 Kargo Takibi</h3>
            
            {/* Status Card */}
            <TrackingStatusCard status={trackingStatus} />
            
            {/* Live Map or Queue Info based on Rule of 5 */}
            {trackingStatus.isLiveTrackingAvailable ? (
              <div className={styles.liveTrackingContainer}>
                <div className={styles.liveHeader}>
                  <span className={styles.liveIndicator}>
                    <span className={styles.liveDot}></span>
                    {signalRConnected ? 'Canlı Takip Aktif' : 'Bağlanıyor...'}
                  </span>
                  <span className={styles.approachingMessage}>
                    🎉 Kurye yaklaşıyor! Sırada {trackingStatus.remainingStops} kişi var.
                  </span>
                </div>
                <UserTrackingMap 
                  carrierId={trackingStatus.carrierId}
                  carrierLocation={liveLocation || trackingStatus.carrierLocation}
                  carrierName={trackingStatus.carrierName || 'Kurye'}
                />
              </div>
            ) : (
              <div className={styles.queueInfoContainer}>
                <div className={styles.blurredMapPlaceholder}>
                  <div className={styles.blurLayer}></div>
                  <div className={styles.queueMessage}>
                    <span className={styles.queueIcon}>📦</span>
                    <h4>Siparişiniz Dağıtımda</h4>
                    <p>Önünüzde <strong>{trackingStatus.remainingStops}</strong> teslimat var.</p>
                    <p className={styles.queueSubtext}>
                      Sıranız yaklaştığında (son 5 teslimat) canlı takip aktif olacaktır.
                    </p>
                    {/* Progress Bar */}
                    <div className={styles.progressContainer}>
                      <div 
                        className={styles.progressBar} 
                        style={{ width: `${Math.max(5, Math.min(100, (1 - trackingStatus.remainingStops / 20) * 100))}%` }}
                      ></div>
                    </div>
                    {trackingStatus.estimatedArrival && (
                      <p className={styles.etaText}>
                        Tahmini varış: <strong>~{trackingStatus.estimatedArrival}</strong>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Loading state for tracking */}
        {trackingLoading && (
          <div className={styles.trackingLoading}>
            <div className={styles.spinner}></div>
            <p>Takip bilgisi yükleniyor...</p>
          </div>
        )}
      </div>
    </div>
  );
}
