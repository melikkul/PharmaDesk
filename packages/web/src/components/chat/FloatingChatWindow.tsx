"use client";

import React from 'react';
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
  return (
    <div 
      className={`${styles.floatingWindow} ${isMinimized ? styles.minimized : ''}`}
      style={{ 
        bottom: `${position.bottom}px`, 
        right: `${position.right}px` 
      }}
    >
      <div className={styles.body}>
        <ChatWindow 
          otherUserId={otherUserId}
          onMinimize={onMinimize}
          onClose={onClose}
          isMinimized={isMinimized}
        />
      </div>
    </div>
  );
};
