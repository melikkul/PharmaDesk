'use client';

import React from 'react';
import styles from './TimelineItem.module.css';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type TimelineEventType = 
  | 'click' 
  | 'navigation' 
  | 'api_request' 
  | 'api_response' 
  | 'error' 
  | 'console'
  | 'page_view'
  | 'form_submit';

export type TimelineStatus = 'success' | 'warning' | 'error' | 'info';

export interface TimelineItemProps {
  id: number;
  timestamp: string;
  type: TimelineEventType;
  title: string;
  subtitle: string;
  status?: TimelineStatus;
  statusCode?: number;
  durationMs?: number;
  traceId?: string;
  isSelected: boolean;
  onClick: () => void;
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

const TYPE_ICONS: Record<TimelineEventType, string> = {
  click: '🖱️',
  navigation: '📄',
  api_request: '🌐',
  api_response: '📥',
  error: '🐞',
  console: '💬',
  page_view: '👁️',
  form_submit: '📝',
};

const TYPE_CLASSES: Record<TimelineEventType, string> = {
  click: styles.typeClick,
  navigation: styles.typeNavigation,
  api_request: styles.typeApiRequest,
  api_response: styles.typeApiResponse,
  error: styles.typeError,
  console: styles.typeConsole,
  page_view: styles.typeNavigation,
  form_submit: styles.typeClick,
};

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

function getStatusFromCode(code: number | undefined): TimelineStatus {
  if (!code) return 'info';
  if (code >= 200 && code < 300) return 'success';
  if (code >= 300 && code < 400) return 'info';
  if (code >= 400 && code < 500) return 'warning';
  return 'error';
}

function getResponseIcon(code: number | undefined): string {
  if (!code) return '📥';
  if (code >= 200 && code < 300) return '✅';
  if (code >= 300 && code < 400) return '↪️';
  if (code >= 400 && code < 500) return '⚠️';
  return '❌';
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export default function TimelineItem({
  id,
  timestamp,
  type,
  title,
  subtitle,
  status,
  statusCode,
  durationMs,
  traceId,
  isSelected,
  onClick,
}: TimelineItemProps) {
  const effectiveStatus = status || (type === 'api_response' ? getStatusFromCode(statusCode) : 'info');
  const icon = type === 'api_response' && statusCode ? getResponseIcon(statusCode) : TYPE_ICONS[type];
  const typeClass = TYPE_CLASSES[type] || '';

  return (
    <div
      className={`${styles.timelineItem} ${typeClass} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      data-event-id={id}
    >
      {/* Icon Node */}
      <div className={`${styles.iconNode} ${styles[effectiveStatus]}`}>
        {icon}
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <span className={styles.timestamp}>{formatTime(timestamp)}</span>
        </div>
        
        <div className={styles.subtitle}>{subtitle}</div>
        
        <div className={styles.metaRow}>
          {statusCode && (
            <span className={`${styles.badge} ${styles[effectiveStatus]}`}>
              {statusCode}
            </span>
          )}
          
          {type === 'error' && (
            <span className={`${styles.badge} ${styles.error}`}>
              ERROR
            </span>
          )}
          
          {durationMs !== undefined && (
            <span className={styles.duration}>
              ⏱️ {durationMs}ms
            </span>
          )}
          
          {traceId && (
            <span className={styles.duration}>
              🔗 {traceId.slice(0, 8)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
