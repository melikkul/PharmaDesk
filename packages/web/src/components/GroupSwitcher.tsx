'use client';

import { useState } from 'react';
import { useGroup } from '@/store/GroupContext';
import styles from './GroupSwitcher.module.css';

export default function GroupSwitcher() {
  const { userGroups, activeGroupId, setActiveGroupId, isLoading } = useGroup();
  const [isOpen, setIsOpen] = useState(false);

  // Don't show switcher if user has 0 or 1 group
  if (isLoading || userGroups.length <= 1) {
    return null;
  }

  const activeGroup = userGroups.find(g => g.id === activeGroupId);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSelectGroup = (groupId: number) => {
    setActiveGroupId(groupId);
    setIsOpen(false);
  };

  return (
    <div className={styles.groupSwitcher}>
      <button
        className={styles.dropdownButton}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className={styles.buttonContent}>
          <GroupIcon className={styles.groupIcon} />
          <span className={styles.groupName}>
            {activeGroup?.name || 'Grup Seçin'}
          </span>
        </div>
        <ChevronIcon className={`${styles.chevron} ${isOpen ? styles.open : ''}`} />
      </button>

      <div className={`${styles.dropdownPanel} ${isOpen ? styles.open : ''}`}>
        <div className={styles.dropdownHeader}>
          <div className={styles.dropdownTitle}>Gruplarım</div>
        </div>
        <div className={styles.groupList}>
          {userGroups.map(group => (
            <div
              key={group.id}
              className={`${styles.groupItem} ${group.id === activeGroupId ? styles.active : ''}`}
              onClick={() => handleSelectGroup(group.id)}
            >
              <div className={styles.groupItemIcon}>
                <GroupIcon />
              </div>
              <div className={styles.groupItemContent}>
                <div className={styles.groupItemName}>{group.name}</div>
              </div>
              {group.id === activeGroupId && (
                <div className={styles.activeIndicator}>
                  <CheckIcon />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// SVG Icons
function GroupIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
