"use client";

import React from 'react';
import { ChatWindow } from './ChatWindow';
import styles from './FloatingChatWindow.module.css';

interface FloatingChatWindowProps {
  conversationId: number;
  isMinimized: boolean;
  onMinimize: () => void;
  onClose: () => void;
  position: { bottom: number; left?: number; right?: number };
}

export const FloatingChatWindow: React.FC<FloatingChatWindowProps> = ({
  conversationId,
  isMinimized,
  onMinimize,
  onClose,
  position
}) => {
  const positionStyle: React.CSSProperties = {
    bottom: `${position.bottom}px`,
    ...(position.left !== undefined ? { left: `${position.left}px` } : {}),
    ...(position.right !== undefined ? { right: `${position.right}px` } : {}),
  };

  return (
    <div 
      className={`${styles.floatingWindow} ${isMinimized ? styles.minimized : ''}`}
      style={positionStyle}
    >
      <div className={styles.body}>
        <ChatWindow 
          conversationId={conversationId}
          onMinimize={onMinimize}
          onClose={onClose}
          isMinimized={isMinimized}
        />
      </div>
    </div>
  );
};
