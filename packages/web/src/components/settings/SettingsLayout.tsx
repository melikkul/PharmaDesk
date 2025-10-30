// components/settings/SettingsLayout.tsx
import React from 'react';
import SettingsSidebar from './SettingsSidebar';
import styles from './SettingsLayout.module.css';

const SettingsLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className={styles.settingsLayout}>
      <SettingsSidebar />
      <div className={styles.settingsContent}>
        {children}
      </div>
    </div>
  );
};

export default SettingsLayout;