'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import DashboardCard from '@/components/DashboardCard';
import styles from './transactionDetail.module.css';

// İkonlar
const BackIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
const InvoiceIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const AlertIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

interface TransactionDetail {
  id: number;
  date: string;
  type: string;
  productName: string | null;
  counterparty: string | null;
  amount: number;
  status: string;
  orderId: number | null;
  offerId: number | null;
}

export default function TransactionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params as { id: string };
  const { token } = useAuth();

  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    fetchTransactionDetail();
  }, [token, id]);

  const fetchTransactionDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/transactions/${id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error('İşlem detayı yüklenemedi');
      }

      const data = await response.json();
      setTransaction(data);
    } catch (err) {
      console.error('İşlem detayı hatası:', err);
      setError('İşlem detayı yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Tamamlandı': return styles.badgeSuccess;
      case 'İşlemde': return styles.badgeWarning;
      case 'İptal': case 'İptal Edildi': return styles.badgeDanger;
      default: return styles.badgeSecondary;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'Satış': return styles.badgeSuccess;
      case 'Alış': return styles.badgeDanger;
      case 'İade': return styles.badgeWarning;
      case 'Bakiye Yükleme': return styles.badgeInfo;
      default: return styles.badgeSecondary;
    }
  };

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    // Backend formatı: "17.12.2025 14:30"
    if (dateStr.includes('.') && dateStr.includes(' ')) {
      const parts = dateStr.split(' ');
      const dateParts = parts[0].split('.');
      const timeParts = parts[1]?.split(':') || ['00', '00'];
      
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        const hour = parseInt(timeParts[0], 10) || 0;
        const minute = parseInt(timeParts[1], 10) || 0;
        
        const date = new Date(year, month, day, hour, minute);
        return date.toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
    return dateStr;
  };

  const formatCurrency = (amount: number) => {
    const formatted = Math.abs(amount).toFixed(2).replace('.', ',');
    return `${amount >= 0 ? '+' : '-'}${formatted} ₺`;
  };

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loading}>İşlem detayı yükleniyor...</div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.error}>{error || 'İşlem bulunamadı'}</div>
        <button onClick={() => router.back()} className={styles.backButton}>
          <BackIcon /> Geri Dön
        </button>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <button onClick={() => router.push('/islem-gecmisi')} className={styles.backButton}>
          <BackIcon /> İşlem Geçmişi
        </button>
        <h1 className={styles.pageTitle}>İşlem Detayı #{transaction.id}</h1>
      </div>

      {/* Ana İçerik */}
      <DashboardCard title="İşlem Bilgileri">
        <div className={styles.detailGrid}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>İşlem No</span>
            <span className={styles.detailValue}>#{transaction.id}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Tarih</span>
            <span className={styles.detailValue}>{formatDate(transaction.date)}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>İşlem Tipi</span>
            <span className={`${styles.badge} ${getTypeBadgeClass(transaction.type)}`}>
              {transaction.type}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Durum</span>
            <span className={`${styles.badge} ${getStatusBadgeClass(transaction.status)}`}>
              {transaction.status}
            </span>
          </div>

          {transaction.productName && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>İlgili Ürün</span>
              <span className={styles.detailValue}>{transaction.productName}</span>
            </div>
          )}

          {transaction.counterparty && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Karşı Taraf</span>
              <span className={styles.detailValue}>{transaction.counterparty}</span>
            </div>
          )}

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Tutar</span>
            <span className={`${styles.detailValue} ${styles.amount} ${transaction.amount >= 0 ? styles.positive : styles.negative}`}>
              {formatCurrency(transaction.amount)}
            </span>
          </div>
        </div>

        {/* İlişkili Linkler */}
        <div className={styles.relatedLinks}>
          {transaction.orderId && (
            <button 
              onClick={() => router.push(`/siparisler/${transaction.orderId}`)}
              className={styles.linkButton}
            >
              <InvoiceIcon /> Sipariş Detayına Git
            </button>
          )}
          
          {transaction.offerId && (
            <button 
              onClick={() => router.push(`/tekliflerim/${transaction.offerId}`)}
              className={styles.linkButton}
            >
              Teklif Detayına Git
            </button>
          )}
        </div>
      </DashboardCard>

      {/* Eylemler */}
      <DashboardCard title="Eylemler">
        <div className={styles.actionsGrid}>
          {transaction.status === 'Tamamlandı' && (transaction.type === 'Alış' || transaction.type === 'Satış') && (
            <button className={styles.actionButton} onClick={() => {
              if (transaction.orderId) {
                router.push(`/siparisler/${transaction.orderId}`);
              } else {
                alert('Bu işlem için fatura bulunmuyor');
              }
            }}>
              <InvoiceIcon />
              <span>Fatura Görüntüle</span>
            </button>
          )}

          <button 
            className={`${styles.actionButton} ${styles.dangerButton}`}
            onClick={() => setShowIssueModal(true)}
          >
            <AlertIcon />
            <span>İşlem İtirazı</span>
          </button>
        </div>
      </DashboardCard>

      {/* İtiraz Modal */}
      {showIssueModal && (
        <IssueReportModal 
          transactionId={transaction.id}
          onClose={() => setShowIssueModal(false)}
        />
      )}
    </div>
  );
}

// İtiraz Modal Component
interface IssueReportModalProps {
  transactionId: number;
  onClose: () => void;
}

function IssueReportModal({ transactionId, onClose }: IssueReportModalProps) {
  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const issueTypes = [
    { value: 'wrong_amount', label: 'Yanlış Tutar' },
    { value: 'wrong_product', label: 'Yanlış Ürün' },
    { value: 'not_received', label: 'Ürün Teslim Alınmadı' },
    { value: 'damaged', label: 'Hasarlı Ürün' },
    { value: 'duplicate', label: 'Mükerrer İşlem' },
    { value: 'other', label: 'Diğer' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!issueType) {
      alert('Lütfen bir sorun türü seçin');
      return;
    }

    setSubmitting(true);

    try {
      // TODO: Backend API çağrısı
      console.log('İtiraz gönderiliyor:', {
        transactionId,
        issueType,
        description
      });

      // Simüle API çağrısı
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSubmitted(true);
    } catch (err) {
      console.error('İtiraz hatası:', err);
      alert('İtiraz gönderilirken bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>İşlem İtirazı</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        {submitted ? (
          <div className={styles.modalBody}>
            <div className={styles.successMessage}>
              <span className={styles.successIcon}>✓</span>
              <h3>İtirazınız Alındı</h3>
              <p>İşlem #{transactionId} için itirazınız başarıyla iletildi. En kısa sürede incelenecektir.</p>
              <button className={styles.primaryButton} onClick={onClose}>
                Tamam
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.modalBody}>
              <p className={styles.modalDescription}>
                İşlem #{transactionId} için itiraz kaydı oluşturun. Talebiniz incelenerek size dönüş yapılacaktır.
              </p>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Sorun Türü *</label>
                <select 
                  value={issueType} 
                  onChange={(e) => setIssueType(e.target.value)}
                  className={styles.formSelect}
                  required
                >
                  <option value="">Seçiniz...</option>
                  {issueTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Açıklama</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={styles.formTextarea}
                  placeholder="Sorunu detaylı olarak açıklayın..."
                  rows={4}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.secondaryButton} onClick={onClose}>
                İptal
              </button>
              <button type="submit" className={styles.primaryButton} disabled={submitting}>
                {submitting ? 'Gönderiliyor...' : 'İtiraz Gönder'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
