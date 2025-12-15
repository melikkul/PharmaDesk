// src/app/(dashboard)/tekliflerim/[offerId]/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import '@/app/(dashboard)/dashboard/dashboard.css';
import styles from '../tekliflerim.module.css';
import { useAuth } from '@/store/AuthContext';
import { offerService } from '@/services/offerService';
import QRLabelModal from '@/components/QRLabelModal';

// Icons
const BackIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
const CheckIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
const CashIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
const PrintIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>;
const EditIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;

interface OfferData {
  id: number;
  productName: string;
  status: string;
  type: string;
  price: number;
  stock: string;
  soldQuantity: number;
  remainingStock: number;
  malFazlasi?: string;
  expirationDate?: string;
  isFinalized: boolean;
  isPaymentProcessed: boolean;
  // Organizer info
  organizerPharmacyName?: string;
  organizerStock?: number;
  createdAt?: string;
  buyers?: Array<{
    pharmacyId: number;
    pharmacyName: string;
    quantity: number;
    orderDate?: string;
  }>;
}

export default function TeklifDetayPage() {
  const router = useRouter();
  const params = useParams();
  const { offerId } = params as { offerId: string };
  const { token } = useAuth();

  const [offer, setOffer] = useState<OfferData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // QR Modal State
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [shipmentLabels, setShipmentLabels] = useState<any[]>([]);

  // Fetch offer data
  useEffect(() => {
    if (!offerId || !token) return;

    const fetchOffer = async () => {
      setIsLoading(true);
      try {
        const data: any = await offerService.getOfferById(token, offerId);
        console.log('Offer API Response:', {
          pharmacyName: data.pharmacyName,
          stock: data.stock,
          createdAt: data.createdAt
        });
        // Parse stock to get organizer's contribution (e.g., "24 + 0" -> 24)
        const stockString = data.stock || '0 + 0';
        const stockParts = stockString.split('+').map((s: string) => parseInt(s.trim()) || 0);
        const organizerStock = stockParts[0] || 0;
        
        setOffer({
          id: data.id,
          productName: data.productName,
          status: data.status,
          type: data.type,
          price: data.price,
          stock: data.stock,
          soldQuantity: data.soldQuantity || 0,
          remainingStock: data.remainingStock || 0,
          malFazlasi: data.malFazlasi,
          expirationDate: data.expirationDate,
          isFinalized: data.isFinalized || false,
          isPaymentProcessed: data.isPaymentProcessed || false,
          organizerPharmacyName: data.pharmacyName || 'Bilinmeyen Eczane',
          organizerStock: organizerStock,
          createdAt: data.createdAt,
          buyers: data.buyers || []
        });
      } catch (err: any) {
        console.error('Error fetching offer:', err);
        if (err?.status === 403) {
          setMessage({ type: 'error', text: 'Bu teklifi görüntüleme yetkiniz yok.' });
        } else {
          setMessage({ type: 'error', text: 'Teklif yüklenirken bir hata oluştu.' });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffer();
  }, [offerId, token]);

  // Finalize offer
  const handleFinalize = useCallback(async () => {
    if (!token || !offer) return;
    if (!confirm('Teklifi sonlandırmak istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;

    setActionLoading('finalize');
    try {
      await offerService.finalizeOffer(token, offer.id);
      setOffer(prev => prev ? { ...prev, isFinalized: true, status: 'passive' } : null);
      setMessage({ type: 'success', text: 'Teklif başarıyla sonlandırıldı!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Teklif sonlandırılırken bir hata oluştu.' });
    } finally {
      setActionLoading(null);
    }
  }, [token, offer]);

  // Process balance
  const handleProcessBalance = useCallback(async () => {
    if (!token || !offer) return;
    if (!confirm('Bakiyeleri işlemek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;

    setActionLoading('balance');
    try {
      const result = await offerService.processBalance(token, offer.id);
      setOffer(prev => prev ? { ...prev, isPaymentProcessed: true } : null);
      setMessage({ type: 'success', text: `${result.capturedAmount.toFixed(2)} TL başarıyla hesabınıza aktarıldı!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Bakiye işlenirken bir hata oluştu.' });
    } finally {
      setActionLoading(null);
    }
  }, [token, offer]);

  // Open QR Labels Modal
  const handlePrintLabels = useCallback(async () => {
    if (!token || !offer) return;

    setActionLoading('labels');
    try {
      const labels = await offerService.getShipmentLabels(token, offer.id);
      setShipmentLabels(labels);
      setIsQRModalOpen(true);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Etiketler yüklenirken bir hata oluştu.' });
    } finally {
      setActionLoading(null);
    }
  }, [token, offer]);

  // Get offer type label
  const getTypeLabel = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'stocksale': return 'Stok Satışı';
      case 'jointorder': return 'Ortak Sipariş';
      case 'purchaserequest': return 'Alım Talebi';
      default: return type || 'Bilinmiyor';
    }
  };

  // Get status badge
  const getStatusBadge = (status: string, isFinalized: boolean) => {
    if (isFinalized) {
      return <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', backgroundColor: '#6366f1', color: 'white' }}>Sonlandırıldı</span>;
    }
    switch (status?.toLowerCase()) {
      case 'active': return <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', backgroundColor: '#10b981', color: 'white' }}>Aktif</span>;
      case 'passive': return <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', backgroundColor: '#f59e0b', color: 'white' }}>Pasif</span>;
      case 'expired': return <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', backgroundColor: '#ef4444', color: 'white' }}>Süresi Doldu</span>;
      default: return <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', backgroundColor: '#9ca3af', color: 'white' }}>{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className={styles.pageContainer}>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>Teklif bulunamadı veya erişim yetkiniz yok.</p>
          <Link href="/tekliflerim" className={styles.primaryButton} style={{ backgroundColor: 'var(--accent-color)' }}>
            <BackIcon /> <span>Geri Dön</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 className={styles.pageTitle}>Teklif Yönetimi</h1>
          {getStatusBadge(offer.status, offer.isFinalized)}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href={`/tekliflerim/${offerId}/duzenle`} className={styles.primaryButton} style={{ backgroundColor: 'var(--accent-color)' }}>
            <EditIcon /> <span>Düzenle</span>
          </Link>
          <Link href="/tekliflerim" className={styles.primaryButton} style={{ backgroundColor: 'var(--text-secondary)' }}>
            <BackIcon /> <span>Geri</span>
          </Link>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
          color: message.type === 'success' ? '#065f46' : '#991b1b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
      )}

      {/* Product Info Card */}
      <div style={{
        backgroundColor: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid var(--border-color)'
      }}>
        <h2 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>{offer.productName}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>Teklif Tipi</p>
            <p style={{ margin: '4px 0 0 0', fontWeight: 500 }}>{getTypeLabel(offer.type)}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>Barem</p>
            <p style={{ margin: '4px 0 0 0', fontWeight: 500 }}>{offer.malFazlasi || offer.stock}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>Fiyat</p>
            <p style={{ margin: '4px 0 0 0', fontWeight: 500 }}>{offer.price.toFixed(2)} TL</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>Satılan</p>
            <p style={{ margin: '4px 0 0 0', fontWeight: 500 }}>{offer.soldQuantity} Adet</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>Kalan</p>
            <p style={{ margin: '4px 0 0 0', fontWeight: 500 }}>{offer.remainingStock} Adet</p>
          </div>
          {offer.expirationDate && (
            <div>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-tertiary)' }}>SKT</p>
              <p style={{ margin: '4px 0 0 0', fontWeight: 500 }}>{offer.expirationDate}</p>
            </div>
          )}
        </div>
      </div>

      {/* Participants Table - Shows organizer and all participants */}
      {(offer.type === 'jointorder' || offer.type === 'purchaserequest' || (offer.buyers && offer.buyers.length > 0)) && (
        <div style={{
          backgroundColor: 'var(--card-bg)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
            👥 Katılımcılar ({1 + (offer.buyers?.length || 0)})
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '12px', fontSize: '14px', color: 'var(--text-tertiary)' }}>Eczane</th>
                  <th style={{ textAlign: 'center', padding: '12px', fontSize: '14px', color: 'var(--text-tertiary)' }}>Rol</th>
                  <th style={{ textAlign: 'right', padding: '12px', fontSize: '14px', color: 'var(--text-tertiary)' }}>Miktar</th>
                  <th style={{ textAlign: 'right', padding: '12px', fontSize: '14px', color: 'var(--text-tertiary)' }}>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {/* Organizer Row */}
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>
                    {offer.organizerPharmacyName}
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--accent-color)' }}>⭐</span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      fontSize: '11px', 
                      fontWeight: 600,
                      backgroundColor: '#6366f1', 
                      color: 'white' 
                    }}>
                      Organizatör
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 500 }}>{offer.organizerStock || 0} Adet</td>
                  <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-secondary)' }}>{offer.createdAt || '-'}</td>
                </tr>
                
                {/* Participant Rows */}
                {offer.buyers?.map((buyer, index) => (
                  <tr key={`${buyer.pharmacyId}-${index}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontWeight: 500 }}>{buyer.pharmacyName}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '12px', 
                        fontSize: '11px', 
                        fontWeight: 600,
                        backgroundColor: '#10b981', 
                        color: 'white' 
                      }}>
                        Katılımcı
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{buyer.quantity} Adet</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-secondary)' }}>{buyer.orderDate || '-'}</td>
                  </tr>
                ))}
              </tbody>
              
              {/* Summary Footer */}
              <tfoot>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', fontWeight: 600 }}>
                  <td colSpan={2} style={{ padding: '12px' }}>Toplam</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    {(offer.organizerStock || 0) + (offer.buyers?.reduce((sum, b) => sum + b.quantity, 0) || 0)} Adet
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    Barem: {offer.malFazlasi}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}


      {/* Action Panel */}
      <div style={{
        backgroundColor: 'var(--card-bg)',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid var(--border-color)'
      }}>
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)' }}>🎛️ Yönetim Paneli</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
          
          {/* 1. Finalize Button */}
          <button
            onClick={handleFinalize}
            disabled={offer.isFinalized || actionLoading !== null}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: offer.isFinalized ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              backgroundColor: offer.isFinalized ? '#d1d5db' : '#6366f1',
              color: 'white',
              opacity: actionLoading === 'finalize' ? 0.7 : 1
            }}
          >
            <CheckIcon />
            {actionLoading === 'finalize' ? 'İşleniyor...' : offer.isFinalized ? 'Sonlandırıldı' : 'Teklifi Sonlandır'}
          </button>

          {/* 2. Process Balance Button */}
          <button
            onClick={handleProcessBalance}
            disabled={!offer.isFinalized || offer.isPaymentProcessed || actionLoading !== null}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: (!offer.isFinalized || offer.isPaymentProcessed) ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              backgroundColor: offer.isPaymentProcessed ? '#d1d5db' : (!offer.isFinalized ? '#e5e7eb' : '#10b981'),
              color: offer.isPaymentProcessed || !offer.isFinalized ? '#6b7280' : 'white',
              opacity: actionLoading === 'balance' ? 0.7 : 1
            }}
          >
            <CashIcon />
            {actionLoading === 'balance' ? 'İşleniyor...' : offer.isPaymentProcessed ? 'Ödeme İşlendi' : 'Bakiyeleri İşle'}
          </button>

          {/* 3. Print Labels Button */}
          <button
            onClick={handlePrintLabels}
            disabled={!offer.isPaymentProcessed || actionLoading !== null}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: !offer.isPaymentProcessed ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              backgroundColor: !offer.isPaymentProcessed ? '#e5e7eb' : '#f59e0b',
              color: !offer.isPaymentProcessed ? '#6b7280' : 'white',
              opacity: actionLoading === 'labels' ? 0.7 : 1
            }}
          >
            <PrintIcon />
            {actionLoading === 'labels' ? 'Yükleniyor...' : 'Etiketleri Yazdır'}
          </button>
        </div>

        {/* Help Text */}
        <div style={{ marginTop: '20px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            <strong>💡 Akış:</strong> 1️⃣ Önce teklifi sonlandır → 2️⃣ Bakiyeleri işle (para hesaba geçer) → 3️⃣ Kargo etiketlerini yazdır
          </p>
        </div>
      </div>

      {/* QR Modal */}
      <QRLabelModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        labels={shipmentLabels}
        productName={offer.productName}
      />
    </div>
  );
}