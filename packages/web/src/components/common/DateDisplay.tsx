// src/components/common/DateDisplay.tsx
'use client';

import React from 'react';

export type DateFormat = 'date' | 'time' | 'datetime' | 'relative';

export interface DateDisplayProps {
  date: string | Date;
  format?: DateFormat;
  className?: string;
}

/**
 * Formats dates using Turkish locale (tr-TR)
 */
const DateDisplay: React.FC<DateDisplayProps> = ({
  date,
  format = 'date',
  className = '',
}) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check for invalid date
  if (isNaN(dateObj.getTime())) {
    return <span className={className}>-</span>;
  }

  const getFormattedDate = (): string => {
    switch (format) {
      case 'date':
        return dateObj.toLocaleDateString('tr-TR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });

      case 'time':
        return dateObj.toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
        });

      case 'datetime':
        return dateObj.toLocaleString('tr-TR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        });

      case 'relative':
        const now = new Date();
        const diffMs = now.getTime() - dateObj.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Az önce';
        if (diffMins < 60) return `${diffMins} dakika önce`;
        if (diffHours < 24) return `${diffHours} saat önce`;
        if (diffDays < 7) return `${diffDays} gün önce`;
        return dateObj.toLocaleDateString('tr-TR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

      default:
        return dateObj.toLocaleDateString('tr-TR');
    }
  };

  return <span className={className}>{getFormattedDate()}</span>;
};

export default DateDisplay;
