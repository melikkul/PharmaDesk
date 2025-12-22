'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import styles from './MissionControlLayout.module.css';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface MissionControlLayoutProps {
  stats: {
    onlineUsers: number;
    activeSessions: number;
    errorsToday: number;
    avgLatency: number;
  };
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  bottomPanel: React.ReactNode;
  selectedUser: string | null;
}

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export default function MissionControlLayout({
  stats,
  leftPanel,
  centerPanel,
  bottomPanel,
  selectedUser,
}: MissionControlLayoutProps) {
  const [bottomPanelHeight, setBottomPanelHeight] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle panel resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newHeight = containerRect.bottom - e.clientY;
      
      // Clamp between 150px and 500px
      setBottomPanelHeight(Math.max(150, Math.min(500, newHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <div 
      ref={containerRef}
      className={styles.missionControl}
      style={{
        '--mc-bottom-panel-height': `${bottomPanelHeight}px`,
      } as React.CSSProperties}
    >
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <span>🛰️</span>
          Mission Control
        </div>
        
        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Online Users</span>
            <span className={`${styles.statValue} ${styles.online}`}>
              {stats.onlineUsers}
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Active Sessions</span>
            <span className={styles.statValue}>
              {stats.activeSessions}
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Errors Today</span>
            <span className={`${styles.statValue} ${stats.errorsToday > 0 ? styles.error : ''}`}>
              {stats.errorsToday}
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Avg Latency</span>
            <span className={`${styles.statValue} ${stats.avgLatency < 100 ? styles.online : stats.avgLatency < 500 ? styles.warning : styles.error}`}>
              {stats.avgLatency}ms
            </span>
          </div>
        </div>
      </header>

      {/* Left Panel - Live User Grid */}
      <aside className={styles.leftPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <span>👥</span>
            Live Sessions
          </div>
          <span className={styles.panelBadge}>{stats.activeSessions}</span>
        </div>
        <div className={styles.userGrid}>
          {leftPanel}
        </div>
      </aside>

      {/* Center Panel - Action Timeline */}
      <main className={styles.centerPanel}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <span>⚡</span>
            {selectedUser ? `Timeline: ${selectedUser}` : 'Action Timeline'}
          </div>
        </div>
        <div className={styles.timelineContainer}>
          {centerPanel || (
            <div className={styles.emptyState}>
              <span>🎯</span>
              <p>Select a user from the left panel to view their action timeline</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Panel - Black Box Inspector */}
      <section className={styles.bottomPanel}>
        <div 
          className={styles.resizeHandle}
          onMouseDown={handleMouseDown}
        />
        <div className={styles.inspectorContent}>
          {bottomPanel}
        </div>
      </section>
    </div>
  );
}
