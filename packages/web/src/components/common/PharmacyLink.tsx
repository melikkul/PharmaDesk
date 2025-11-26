// src/components/common/PharmacyLink.tsx
'use client';

import React from 'react';
import Link from 'next/link';

export interface PharmacyLinkProps {
  id: string | number;
  name?: string;
  className?: string;
  showAvatar?: boolean;
  children?: React.ReactNode;
}

/**
 * Smart link component for pharmacy profiles
 * Automatically handles routing to /profile/me or /profile/{id}
 */
const PharmacyLink: React.FC<PharmacyLinkProps> = ({
  id,
  name,
  className = '',
  showAvatar = false,
  children,
}) => {
  // Handle both "me" and numeric IDs
  const href = id === 'me' || id === 'me' ? '/profile/me' : `/profile/${id}`;

  const displayText = children || name || `Eczane #${id}`;

  return (
    <Link href={href} className={className}>
      {showAvatar && (
        <span style={{ marginRight: '0.5rem' }}>👤</span>
      )}
      {displayText}
    </Link>
  );
};

export default PharmacyLink;
