// components/settings/SettingsLayout.tsx
import React from 'react';
import SettingsSidebar from './SettingsSidebar';

const SettingsLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="settings-layout">
      <SettingsSidebar />
      <div className="settings-content">
        {children}
      </div>
    </div>
  );
};

export default SettingsLayout;