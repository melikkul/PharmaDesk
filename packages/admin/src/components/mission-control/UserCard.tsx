'use client';

import React from 'react';
import styles from './UserCard.module.css';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface UserCardProps {
  sessionId: string;
  userName: string;
  pharmacyName: string;
  status: 'online' | 'idle' | 'offline';
  latencyMs: number;
  requestCount: number;
  errorCount: number;
  lastActivity: string;
  isSelected: boolean;
  onClick: () => void;
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function getInitials(name: string): string {
  return name
    .split(/[@\s]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('');
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

function getLatencyClass(ms: number): string {
  if (ms < 100) return styles.latencyGood;
  if (ms < 500) return styles.latencyMedium;
  return styles.latencyBad;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export default function UserCard({
  sessionId,
  userName,
  pharmacyName,
  status,
  latencyMs,
  requestCount,
  errorCount,
  lastActivity,
  isSelected,
  onClick,
}: UserCardProps) {
  return (
    <div
      className={`${styles.userCard} ${styles[status]} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Header */}
      <div className={styles.cardHeader}>
        <div className={styles.avatar}>
          {getInitials(userName)}
        </div>
        
        <div className={styles.userInfo}>
          <div className={styles.userName}>{userName}</div>
          <div className={styles.pharmacyName}>{pharmacyName}</div>
        </div>
        
        <div className={`${styles.statusBadge} ${styles[status]}`}>
          <span className={styles.statusDot} />
          {status}
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={`${styles.stat} ${getLatencyClass(latencyMs)}`}>
          <span className={styles.statIcon}>⚡</span>
          <span className={styles.statValue}>{latencyMs}ms</span>
        </div>
        
        <div className={styles.stat}>
          <span className={styles.statIcon}>📊</span>
          <span className={styles.statValue}>{requestCount}</span>
        </div>
        
        <div className={`${styles.stat} ${errorCount > 0 ? styles.hasErrors : ''}`}>
          <span className={styles.statIcon}>🐞</span>
          <span className={styles.statValue}>{errorCount}</span>
        </div>
      </div>

      {/* Activity */}
      <div className={styles.activityRow}>
        <span className={styles.lastActivity}>
          🕐 {formatTimeAgo(lastActivity)}
        </span>
        <span>#{sessionId.slice(0, 8)}</span>
      </div>
    </div>
  );
}
