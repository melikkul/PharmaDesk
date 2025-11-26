// src/components/common/PriceDisplay.tsx
'use client';

import React from 'react';

export interface PriceDisplayProps {
  amount: number;
  currency?: 'TRY' | 'USD' | 'EUR';
  showSymbol?: boolean;
  className?: string;
}

/**
 * Standardized price display component
 * Formats numbers to Turkish locale with currency symbol
 */
const PriceDisplay: React.FC<PriceDisplayProps> = ({
  amount,
  currency = 'TRY',
  showSymbol = true,
  className = '',
}) => {
  // Format with Turkish locale (comma for decimals, dot for thousands)
  const formatted = amount.toFixed(2).replace('.', ',');

  const currencySymbol = currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : '€';

  return (
    <span className={className}>
      {formatted} {showSymbol && currencySymbol}
    </span>
  );
};

export default PriceDisplay;
