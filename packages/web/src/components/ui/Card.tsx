// src/components/ui/Card.tsx
'use client';

import React from 'react';
import styles from './Card.module.css';

export interface CardProps {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, actions, className = '' }) => {
  return (
    <div className={`${styles.card} ${className}`}>
      {(title || actions) && (
        <div className={styles.cardHeader}>
          {title && <h3 className={styles.cardTitle}>{title}</h3>}
          {actions && <div className={styles.cardActions}>{actions}</div>}
        </div>
      )}
      <div className={styles.cardContent}>{children}</div>
    </div>
  );
};

export default Card;
