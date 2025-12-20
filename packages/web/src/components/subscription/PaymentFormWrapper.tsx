"use client";

import { useState } from 'react';
import styles from './PaymentFormWrapper.module.css';
import { useAuth } from '@/store/AuthContext';

interface PaymentFormProps {
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PaymentFormWrapper({ amount, onSuccess, onCancel }: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { } = useAuth(); // Auth context available if needed for future enhancements

  // Form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');

  // Validation state
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // ═══════════════════════════════════════════════════════════════
  // Credit Card Validation (Luhn Algorithm)
  // ═══════════════════════════════════════════════════════════════
  
  const validateLuhn = (num: string): boolean => {
    const cleaned = num.replace(/\D/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) return false;

    let sum = 0;
    let alternate = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);

      if (alternate) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      alternate = !alternate;
    }

    return sum % 10 === 0;
  };

  const getCardBrand = (num: string): string => {
    const cleaned = num.replace(/\D/g, '');
    if (/^4/.test(cleaned)) return 'Visa';
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'Mastercard';
    if (/^3[47]/.test(cleaned)) return 'American Express';
    if (/^6(?:011|5)/.test(cleaned)) return 'Discover';
    if (/^9792/.test(cleaned)) return 'Troy';
    return '';
  };

  const formatCardNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g) || [];
    return groups.join(' ').substring(0, 19);
  };

  // ═══════════════════════════════════════════════════════════════
  // Form Validation
  // ═══════════════════════════════════════════════════════════════

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Card number validation
    const cleanedCardNumber = cardNumber.replace(/\D/g, '');
    if (!cleanedCardNumber) {
      newErrors.cardNumber = 'Kart numarası gereklidir';
    } else if (!validateLuhn(cleanedCardNumber)) {
      newErrors.cardNumber = 'Geçersiz kart numarası';
    }

    // Expiry month validation
    const month = parseInt(expiryMonth, 10);
    if (!expiryMonth) {
      newErrors.expiryMonth = 'Ay gerekli';
    } else if (month < 1 || month > 12) {
      newErrors.expiryMonth = 'Geçersiz';
    }

    // Expiry year validation
    const year = parseInt(expiryYear, 10);
    const currentYear = new Date().getFullYear() % 100;
    if (!expiryYear) {
      newErrors.expiryYear = 'Yıl gerekli';
    } else if (year < currentYear) {
      newErrors.expiryYear = 'Geçersiz';
    }

    // CVC validation
    if (!cvc) {
      newErrors.cvc = 'CVC gerekli';
    } else if (cvc.length < 3) {
      newErrors.cvc = 'Geçersiz CVC';
    }

    // Card holder validation
    if (!cardHolderName.trim()) {
      newErrors.cardHolderName = 'Kart sahibi adı gereklidir';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ═══════════════════════════════════════════════════════════════
  // Payment Submission
  // ═══════════════════════════════════════════════════════════════

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/subscription/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          cardNumber: cardNumber.replace(/\D/g, ''),
          expiryMonth,
          expiryYear,
          cvc,
          cardHolderName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ödeme işlemi başarısız');
      }

      if (data.success) {
        // Update auth context with new token if provided
        // (Token is set via cookie by the API, but we might need to refresh state)
        onSuccess();
      } else {
        throw new Error(data.message || 'Ödeme işlemi başarısız');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ödeme işlemi sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const cardBrand = getCardBrand(cardNumber);

  return (
    <div className={styles.wrapper}>
      {error && (
        <div className={styles.errorMessage}>
          <span>⚠️</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Card Number */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Kart Numarası
            {cardBrand && <span className={styles.cardBrand}>{cardBrand}</span>}
          </label>
          <input
            type="text"
            className={`${styles.input} ${errors.cardNumber ? styles.inputError : ''}`}
            placeholder="0000 0000 0000 0000"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            maxLength={19}
            disabled={loading}
          />
          {errors.cardNumber && <span className={styles.errorText}>{errors.cardNumber}</span>}
        </div>

        {/* Card Holder Name */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Kart Sahibi</label>
          <input
            type="text"
            className={`${styles.input} ${errors.cardHolderName ? styles.inputError : ''}`}
            placeholder="AD SOYAD"
            value={cardHolderName}
            onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
            disabled={loading}
          />
          {errors.cardHolderName && <span className={styles.errorText}>{errors.cardHolderName}</span>}
        </div>

        {/* Expiry and CVC Row */}
        <div className={styles.row}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Son Kullanma</label>
            <div className={styles.expiryGroup}>
              <input
                type="text"
                className={`${styles.input} ${styles.expiryInput} ${errors.expiryMonth ? styles.inputError : ''}`}
                placeholder="AA"
                value={expiryMonth}
                onChange={(e) => setExpiryMonth(e.target.value.replace(/\D/g, '').substring(0, 2))}
                maxLength={2}
                disabled={loading}
              />
              <span className={styles.expirySeparator}>/</span>
              <input
                type="text"
                className={`${styles.input} ${styles.expiryInput} ${errors.expiryYear ? styles.inputError : ''}`}
                placeholder="YY"
                value={expiryYear}
                onChange={(e) => setExpiryYear(e.target.value.replace(/\D/g, '').substring(0, 2))}
                maxLength={2}
                disabled={loading}
              />
            </div>
            {(errors.expiryMonth || errors.expiryYear) && (
              <span className={styles.errorText}>{errors.expiryMonth || errors.expiryYear}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>CVC/CVV</label>
            <input
              type="text"
              className={`${styles.input} ${styles.cvcInput} ${errors.cvc ? styles.inputError : ''}`}
              placeholder="***"
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').substring(0, 4))}
              maxLength={4}
              disabled={loading}
            />
            {errors.cvc && <span className={styles.errorText}>{errors.cvc}</span>}
          </div>
        </div>

        {/* Amount Display */}
        <div className={styles.amountDisplay}>
          <span>Ödenecek Tutar</span>
          <span className={styles.amountValue}>{amount.toLocaleString('tr-TR')} ₺</span>
        </div>

        {/* Buttons */}
        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={loading}
          >
            İptal
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={styles.buttonSpinner}></span>
                İşleniyor...
              </>
            ) : (
              <>Ödemeyi Tamamla</>
            )}
          </button>
        </div>

        {/* Security Note */}
        <div className={styles.securityNote}>
          <span>🔒</span>
          <span>Ödeme bilgileriniz 256-bit SSL şifreleme ile korunmaktadır</span>
        </div>
      </form>
    </div>
  );
}
