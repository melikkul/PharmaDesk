'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ShipmentLabel {
  shipmentId: number;
  orderNumber: string;
  buyerPharmacyName: string;
  buyerPharmacyId: number;
  quantity: number;
  qrToken: string;
}

interface QRLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  labels: ShipmentLabel[];
  productName?: string;
}

export default function QRLabelModal({ isOpen, onClose, labels, productName }: QRLabelModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .qr-print-area, .qr-print-area * {
            visibility: visible;
          }
          .qr-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .qr-modal-overlay {
            display: none;
          }
          .qr-label-card {
            page-break-inside: avoid;
            border: 1px solid #333 !important;
            margin: 20px auto !important;
            padding: 20px !important;
            max-width: 300px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Modal Overlay */}
      <div 
        className="qr-modal-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}
        onClick={onClose}
      >
        {/* Modal Content */}
        <div 
          style={{
            backgroundColor: 'var(--card-bg, #fff)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '24px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary, #333)' }}>
              📦 Kargo Etiketleri {productName && `- ${productName}`}
            </h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handlePrint}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--accent-color, #10b981)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🖨️ Yazdır
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--bg-secondary, #f3f4f6)',
                  color: 'var(--text-primary, #333)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                ✕ Kapat
              </button>
            </div>
          </div>

          {/* Labels */}
          <div className="qr-print-area" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
            {labels.length === 0 ? (
              <p style={{ color: 'var(--text-secondary, #666)', textAlign: 'center', width: '100%' }}>
                Henüz sipariş bulunmamaktadır.
              </p>
            ) : (
              labels.map((label, index) => (
                <div 
                  key={label.shipmentId}
                  className="qr-label-card"
                  style={{
                    backgroundColor: 'white',
                    border: '2px solid var(--border-color, #e5e7eb)',
                    borderRadius: '12px',
                    padding: '20px',
                    textAlign: 'center',
                    minWidth: '280px',
                    maxWidth: '320px'
                  }}
                >
                  {/* QR Code */}
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                    <QRCodeSVG
                      value={label.qrToken}
                      size={160}
                      level="H"
                      includeMargin={true}
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>

                  {/* Label Info */}
                  <div style={{ borderTop: '1px dashed #ccc', paddingTop: '16px' }}>
                    <p style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '18px', 
                      fontWeight: 600,
                      color: '#333'
                    }}>
                      Kargo Kodu: #{label.shipmentId}
                    </p>
                    <p style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      Sipariş: {label.orderNumber}
                    </p>
                    <p style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '16px',
                      fontWeight: 500,
                      color: '#333'
                    }}>
                      🏥 Alıcı: {label.buyerPharmacyName}
                    </p>
                    <p style={{ 
                      margin: '0', 
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      Miktar: {label.quantity} Adet
                    </p>
                  </div>

                  {/* Label Index */}
                  <div style={{ 
                    marginTop: '12px', 
                    fontSize: '12px', 
                    color: '#999',
                    borderTop: '1px solid #eee',
                    paddingTop: '8px'
                  }}>
                    Etiket {index + 1} / {labels.length}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Instructions */}
          <div className="no-print" style={{ 
            marginTop: '24px', 
            padding: '16px', 
            backgroundColor: 'var(--bg-secondary, #f9fafb)',
            borderRadius: '8px',
            fontSize: '14px',
            color: 'var(--text-secondary, #666)'
          }}>
            <strong>💡 Kullanım:</strong> QR kodları kargo paketlerine yapıştırın. Alıcı eczane, bu kodu taratarak teslimatı onaylayabilir.
          </div>
        </div>
      </div>
    </>
  );
}
