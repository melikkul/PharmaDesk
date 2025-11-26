// src/components/ui/Badge.tsx
'use client';

import React from 'react';
import styles from './Badge.module.css';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ label, variant = 'default', className = '' }) => {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {label}
    </span>
  );
};

export default Badge;
