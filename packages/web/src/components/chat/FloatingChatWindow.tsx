"use client";

import React, { useState } from 'react';
import { ChatWindow } from './ChatWindow';
import styles from './FloatingChatWindow.module.css';

interface FloatingChatWindowProps {
  otherUserId: string;
  isMinimized: boolean;
  onMinimize: () => void;
  onClose: () => void;
  position: { bottom: number; right: number };
}

export const FloatingChatWindow: React.FC<FloatingChatWindowProps> = ({
  otherUserId,
  isMinimized,
  onMinimize,
  onClose,
  position
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  return (
    <div 
      className={`${styles.floatingWindow} ${isMinimized ? styles.minimized : ''}`}
      style={{ 
        bottom: `${position.bottom}px`, 
        right: `${position.right}px` 
      }}
    >
      <div 
        className={styles.header}
        onMouseDown={(e) => {
          setIsDragging(true);
          setDragOffset({ x: e.clientX, y: e.clientY });
        }}
      >
        <div className={styles.headerContent}>
          <span className={styles.title}>Chat</span>
          <div className={styles.actions}>
            <button 
              className={styles.actionBtn}
              onClick={onMinimize}
              title={isMinimized ? "Maximize" : "Minimize"}
            >
              {isMinimized ? '□' : '_'}
            </button>
            <button 
              className={styles.actionBtn}
              onClick={onClose}
              title="Close"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      {!isMinimized && (
        <div className={styles.body}>
          <ChatWindow 
            otherUserId={otherUserId} 
            onBack={onClose}
          />
        </div>
      )}
    </div>
  );
};
