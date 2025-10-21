// components/settings/SettingsCard.tsx
import React from 'react';

interface SettingsCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const SettingsCard: React.FC<SettingsCardProps> = ({ title, description, children, footer }) => {
  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <h3 className="settings-card-title">{title}</h3>
        <p className="settings-card-description">{description}</p>
      </div>
      <div className="settings-card-body">
        {children}
      </div>
      {footer && (
        <div className="settings-card-footer">
          {footer}
        </div>
      )}
    </div>
  );
};

export default SettingsCard;