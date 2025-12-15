'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface Group {
  id: number;
  name: string;
}

interface GroupContextType {
  userGroups: Group[];
  activeGroupId: number | null;
  setActiveGroupId: (id: number) => void;
  isLoading: boolean;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [activeGroupIdState, setActiveGroupIdState] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) return;
    
    if (user?.pharmacyId) {
      fetchUserGroups();
    } else {
      setUserGroups([]);
      setActiveGroupIdState(null);
      setIsLoading(false);
    }
  }, [user, isAuthLoading, token]);

  const fetchUserGroups = async () => {
    try {
      setIsLoading(true);
      // Use relative URL to leverage Next.js rewrites (proxies to backend)
      // This avoids CORS issues and ensures connectivity in Docker/Localhost environments
      const apiUrl = ''; 
      
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      const res = await fetch(`${apiUrl}/api/users/my-groups`, {
        credentials: 'include',
        headers: {
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        const groups: Group[] = await res.json();
        setUserGroups(groups);
        
        // Set active group from localStorage or use first group
        const savedGroupId = localStorage.getItem('activeGroupId');
        if (savedGroupId && groups.some(g => g.id === Number(savedGroupId))) {
          setActiveGroupIdState(Number(savedGroupId));
        } else if (groups.length > 0) {
          setActiveGroupIdState(groups[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching user groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setActiveGroupId = (id: number) => {
    setActiveGroupIdState(id);
    localStorage.setItem('activeGroupId', id.toString());
  };

  return (
    <GroupContext.Provider value={{ userGroups, activeGroupId: activeGroupIdState, setActiveGroupId, isLoading }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
}
