// components/ui/SlidePanel.tsx

import React from 'react';

interface SlidePanelProps {
  title: string;
  show: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // GÜNCELLENDİ: Prop opsiyonel yapıldı (?)
  onMarkAllRead?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  width?: string; // Optional width prop for wider panels
}

const SlidePanel: React.FC<SlidePanelProps> = ({ title, show, onClose, children, onMarkAllRead, width }) => (
    <>
        <div className={`slide-panel-overlay ${show ? 'show' : ''}`} onClick={onClose}></div>
        <div 
          className={`slide-panel ${show ? 'show' : ''} ${width ? 'slide-panel--wide' : ''}`}
        >
            <div className="panel-header">
                <h3>{title}</h3>
                <div className="panel-actions">
                     {/* GÜNCELLENDİ: Sadece onMarkAllRead varsa göster */}
                     {onMarkAllRead && (
                       <a href="#" onClick={onMarkAllRead}>Tümünü okundu işaretle</a>
                     )}
                     <button onClick={onClose} className="panel-close-btn">&times;</button>
                </div>
            </div>
            <div className="panel-body">
                {children}
            </div>
        </div>
    </>
);

export default SlidePanel;