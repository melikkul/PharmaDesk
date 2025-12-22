'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import MissionControlLayout from '@/components/mission-control/MissionControlLayout';
import UserCard from '@/components/mission-control/UserCard';
import TimelineItem, { TimelineEventType, TimelineStatus } from '@/components/mission-control/TimelineItem';
import BlackBoxInspector from '@/components/mission-control/BlackBoxInspector';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface UserSession {
  sessionId: string;
  traceId: string;
  userName: string;
  pharmacyName: string;
  status: 'online' | 'idle' | 'offline';
  lastActivity: string;
  latencyMs: number;
  requestCount: number;
  errorCount: number;
}

interface TimelineEvent {
  id: number;
  timestamp: string;
  action: string;
  entityName: string;
  logType: string | null;
  httpMethod: string | null;
  requestPath: string | null;
  httpStatusCode: number | null;
  durationMs: number | null;
  isSuccess: boolean;
  errorMessage: string | null;
  clientLogs: unknown;
  serverLogs: unknown;
  traceId: string | null;
}

interface LogEntry {
  timestamp: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

interface NetworkEntry {
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  status: number;
  durationMs: number;
  size?: number;
}

interface Stats {
  onlineUsers: number;
  activeSessions: number;
  errorsToday: number;
  avgLatency: number;
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function mapEventType(event: TimelineEvent): TimelineEventType {
  if (event.logType === 'ClientError' || event.logType === 'Error' || !event.isSuccess) {
    return 'error';
  }
  if (event.logType === 'ClientSession') {
    return 'console';
  }
  if (event.httpMethod) {
    return event.httpStatusCode ? 'api_response' : 'api_request';
  }
  if (event.action?.includes('Click') || event.action?.includes('Tıkla')) {
    return 'click';
  }
  if (event.action?.includes('Page') || event.action?.includes('Sayfa')) {
    return 'navigation';
  }
  return 'api_request';
}

function mapEventStatus(event: TimelineEvent): TimelineStatus {
  if (!event.isSuccess || event.errorMessage) return 'error';
  if (event.httpStatusCode) {
    if (event.httpStatusCode >= 400) return 'error';
    if (event.httpStatusCode >= 300) return 'warning';
    return 'success';
  }
  return 'info';
}

function parseClientLogs(logs: unknown): LogEntry[] {
  if (!logs) return [];
  
  // If logs is a string, try to parse as JSON
  let parsedLogs = logs;
  if (typeof logs === 'string') {
    try {
      parsedLogs = JSON.parse(logs);
    } catch {
      // If parsing fails, treat the string as a single log message
      return [{ timestamp: new Date().toISOString(), level: 'log', message: logs }];
    }
  }
  
  if (Array.isArray(parsedLogs)) {
    return parsedLogs.map((log: Record<string, unknown>) => ({
      timestamp: String(log.timestamp || new Date().toISOString()),
      level: (log.level as LogEntry['level']) || 'log',
      message: String(log.message || JSON.stringify(log)),
    }));
  }
  
  if (typeof parsedLogs === 'object' && parsedLogs !== null) {
    const obj = parsedLogs as Record<string, unknown>;
    return [{
      timestamp: String(obj.timestamp || new Date().toISOString()),
      level: (obj.level as LogEntry['level']) || 'log',
      message: String(obj.message || JSON.stringify(obj)),
    }];
  }
  
  return [];
}

function parseServerLogs(logs: unknown, errorMessage: string | null): LogEntry[] {
  const result: LogEntry[] = [];
  
  if (errorMessage) {
    result.push({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: errorMessage,
    });
  }
  
  if (!logs) return result;
  
  if (Array.isArray(logs)) {
    logs.forEach((log: Record<string, unknown>) => {
      result.push({
        timestamp: String(log.timestamp || new Date().toISOString()),
        level: (log.level as LogEntry['level']) || 'info',
        message: String(log.message || JSON.stringify(log)),
      });
    });
  } else if (typeof logs === 'string') {
    result.push({ timestamp: new Date().toISOString(), level: 'info', message: logs });
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════

export default function MissionControlPage() {
  const { api } = useAuth();

  // State
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [stats, setStats] = useState<Stats>({
    onlineUsers: 0,
    activeSessions: 0,
    errorsToday: 0,
    avgLatency: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [sessionClientLogs, setSessionClientLogs] = useState<TimelineEvent[]>([]);


  // Fetch sessions (grouped by user) - ONLY registered users
  const fetchSessions = useCallback(async () => {
    try {
      // Get recent logs grouped by sessionId/userId
      const response = await api.get(`/api/admin/audit/logs?pageSize=100&excludeAdminUsers=true`);
      const logs = response.data.data as TimelineEvent[];
      
      // Group by user - ONLY registered users (with valid userId)
      const userMap = new Map<string, UserSession>();
      
      logs.forEach((log: TimelineEvent & { userName?: string; userId?: number; ipAddress?: string; sessionId?: string }) => {
        // SKIP anonymous visitors - only show registered users
        const hasValidUserId = log.userId && log.userId > 0;
        const userName = log.userName?.trim();
        const isValidUserName = userName && 
          userName.length > 0 && 
          !userName.toLowerCase().includes('null') &&
          !userName.toLowerCase().includes('undefined') &&
          userName !== 'User-' &&
          userName !== 'Kullanıcı #0';
        
        // Skip if not a registered user
        if (!hasValidUserId && !isValidUserName) {
          return; // Skip anonymous visitors
        }
        
        // Create a readable user identifier
        const key = isValidUserName ? userName : `Kullanıcı #${log.userId}`;
        
        if (!userMap.has(key)) {
          const now = new Date();
          const logTime = new Date(log.timestamp);
          const diffMin = (now.getTime() - logTime.getTime()) / 60000;
          
          let status: 'online' | 'idle' | 'offline' = 'offline';
          if (diffMin < 5) status = 'online';
          else if (diffMin < 30) status = 'idle';
          
          userMap.set(key, {
            sessionId: log.traceId || String(log.id),
            traceId: log.traceId || '',
            userName: key,
            pharmacyName: 'PharmaDesk',
            status,
            lastActivity: log.timestamp,
            latencyMs: log.durationMs || 0,
            requestCount: 0,
            errorCount: 0,
          });
        }
        
        const session = userMap.get(key)!;
        session.requestCount++;
        if (!log.isSuccess || (log.httpStatusCode && log.httpStatusCode >= 400)) {
          session.errorCount++;
        }
        if (log.durationMs) {
          session.latencyMs = Math.round((session.latencyMs + log.durationMs) / 2);
        }
      });
      
      // Limit to 15 sessions for cleaner UI
      setSessions(Array.from(userMap.values()).slice(0, 15));
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  }, [api]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/audit/stats');
      const data = response.data;
      
      setStats(prev => ({
        ...prev,
        errorsToday: data.errorsLast24h || 0,
        avgLatency: Math.round(data.avgRequestDurationMs || 0),
      }));
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [api]);

  // Fetch timeline for selected user
  const fetchTimeline = useCallback(async (userName: string) => {
    try {
      const response = await api.get(`/api/admin/audit/logs?search=${encodeURIComponent(userName)}&pageSize=50&excludeAdminUsers=true`);
      setTimeline(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
      setTimeline([]);
    }
  }, [api]);

  // Initial load - only run once on mount
  useEffect(() => {
    let isMounted = true;
    
    const load = async () => {
      setLoading(true);
      await fetchSessions();
      await fetchStats();
      if (isMounted) {
        setLoading(false);
      }
    };
    load();
    
    // Refresh every 60 seconds to avoid rate limiting
    const interval = setInterval(() => {
      fetchSessions();
      fetchStats();
    }, 60000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Update stats when sessions change (derived state)
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      onlineUsers: sessions.filter(s => s.status === 'online').length,
      activeSessions: sessions.length,
    }));
  }, [sessions]);

  // Fetch full event details (including logs) when selecting an event
  const fetchEventDetails = useCallback(async (eventId: number, traceId: string | null) => {
    try {
      // First try to get by traceId for full session data
      if (traceId) {
        const response = await api.get(`/api/admin/audit/logs/${traceId}`);
        const data = response.data;
        
        // Find the specific event in the timeline
        const eventData = data.timeline?.find((e: { id: number }) => e.id === eventId) || data.timeline?.[0];
        
        if (eventData) {
          return {
            clientLogs: eventData.ClientLogs || eventData.clientLogs,
            serverLogs: eventData.ServerLogs || eventData.serverLogs,
            performanceMetrics: eventData.PerformanceMetrics || eventData.performanceMetrics,
            clientMetadata: data.clientMetadata,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch event details:', error);
      return null;
    }
  }, [api]);

  // Handle session selection
  const handleSessionSelect = async (session: UserSession) => {
    setSelectedSession(session);
    setSelectedEvent(null);
    setSessionClientLogs([]);
    
    // Fetch timeline events for this user
    fetchTimeline(session.userName);
    
    // Also fetch ClientSession/ClientError logs for this user's session
    try {
      // Get ClientSession logs AND ClientError logs
      const [sessionLogsRes, errorLogsRes] = await Promise.all([
        api.get(`/api/admin/audit/logs?logType=ClientSession&pageSize=20&excludeAdminUsers=true`),
        api.get(`/api/admin/audit/logs?logType=ClientError&pageSize=20&excludeAdminUsers=true`),
      ]);
      
      // Combine both types of client-side logs
      const allClientLogs = [
        ...(sessionLogsRes.data.data || []),
        ...(errorLogsRes.data.data || []),
      ] as TimelineEvent[];
      
      // Sort by timestamp descending
      allClientLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setSessionClientLogs(allClientLogs);
    } catch (error) {
      console.error('Failed to fetch client logs:', error);
    }
  };

  // Handle event selection - fetch full details
  const handleEventSelect = async (event: TimelineEvent) => {
    setSelectedEvent(event);
    setLoadingDetails(true);
    
    try {
      // Fetch detailed logs for this event
      const details = await fetchEventDetails(event.id, event.traceId);
      if (details) {
        setSelectedEvent(prev => prev ? {
          ...prev,
          clientLogs: details.clientLogs || prev.clientLogs,
          serverLogs: details.serverLogs || prev.serverLogs,
        } : prev);
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  // Prepare inspector data
  // Find the time window for the selected event
  // Timeline is sorted descending (newest first: index 0 = newest)
  // When user clicks an event, they want to see logs that occurred AFTER that event
  // until the NEXT event (which is at index-1, the newer one)
  const getTimeWindow = (): { start: Date; end: Date | null } | null => {
    if (!selectedEvent) return null;
    
    const eventTime = new Date(selectedEvent.timestamp);
    const selectedIndex = timeline.findIndex(e => e.id === selectedEvent.id);
    
    // Use a wider time window (30 seconds before) to catch async operations and related logs
    const start = new Date(eventTime.getTime() - 30000); // 30 seconds before for async ops
    
    let end: Date | null = null;
    if (selectedIndex > 0) {
      // There's a newer event at index-1, use its time as the end
      // Add 2 seconds buffer for async console logs
      end = new Date(new Date(timeline[selectedIndex - 1].timestamp).getTime() + 2000);
    } else {
      // This is the newest event, use current time or 60 seconds after
      end = new Date(eventTime.getTime() + 60000);
    }
    
    return { start, end };
  };

  // Filter logs to show only those within the selected event's time window
  const filterLogsByTimeWindow = (logs: LogEntry[]): LogEntry[] => {
    const window = getTimeWindow();
    if (!window) return logs;
    
    const filtered = logs.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= window.start && logTime <= window.end!;
    });
    
    // If no logs found in the time window, return all logs as fallback
    // This prevents the "no logs" state when trace linking is imperfect
    return filtered.length > 0 ? filtered : logs;
  };

  // Combine selected event's clientLogs with session-wide client logs, filtered by time
  const eventClientLogs = selectedEvent ? parseClientLogs(selectedEvent.clientLogs) : [];
  const allSessionClientLogs = sessionClientLogs.flatMap(log => {
    const parsedLogs = parseClientLogs(log.clientLogs);
    // Add the log's parent timestamp if individual logs don't have timestamps
    return parsedLogs.map(l => ({
      ...l,
      timestamp: l.timestamp || log.timestamp,
    }));
  });
  
  // Apply time-based filtering if an event is selected
  // If event has its own clientLogs, show those first; otherwise show filtered session logs
  const filteredSessionLogs = selectedEvent ? filterLogsByTimeWindow(allSessionClientLogs) : allSessionClientLogs;
  const clientLogs = eventClientLogs.length > 0 
    ? eventClientLogs 
    : (filteredSessionLogs.length > 0 ? filteredSessionLogs : allSessionClientLogs);
  
  const serverLogs = selectedEvent ? parseServerLogs(selectedEvent.serverLogs, selectedEvent.errorMessage) : [];
  
  const networkRequests: NetworkEntry[] = selectedEvent && selectedEvent.httpMethod ? [{
    timestamp: selectedEvent.timestamp,
    method: selectedEvent.httpMethod as NetworkEntry['method'],
    url: selectedEvent.requestPath || '/unknown',
    status: selectedEvent.httpStatusCode || 200,
    durationMs: selectedEvent.durationMs || 0,
  }] : [];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: '#0d1117',
        color: '#f0f6fc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛰️</div>
          <div>Mission Control Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <MissionControlLayout
      stats={stats}
      selectedUser={selectedSession?.userName || null}
      leftPanel={
        sessions.length > 0 ? (
          sessions.map(session => (
            <UserCard
              key={session.sessionId}
              sessionId={session.sessionId}
              userName={session.userName}
              pharmacyName={session.pharmacyName}
              status={session.status}
              latencyMs={session.latencyMs}
              requestCount={session.requestCount}
              errorCount={session.errorCount}
              lastActivity={session.lastActivity}
              isSelected={selectedSession?.sessionId === session.sessionId}
              onClick={() => handleSessionSelect(session)}
            />
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: '#6e7681' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>👻</div>
            <div>No active sessions</div>
          </div>
        )
      }
      centerPanel={
        selectedSession && timeline.length > 0 ? (
          timeline.map(event => (
            <TimelineItem
              key={event.id}
              id={event.id}
              timestamp={event.timestamp}
              type={mapEventType(event)}
              title={event.action}
              subtitle={event.requestPath || event.entityName}
              status={mapEventStatus(event)}
              statusCode={event.httpStatusCode || undefined}
              durationMs={event.durationMs || undefined}
              traceId={event.traceId || undefined}
              isSelected={selectedEvent?.id === event.id}
              onClick={() => handleEventSelect(event)}
            />
          ))
        ) : null
      }
      bottomPanel={
        <BlackBoxInspector
          clientLogs={clientLogs}
          serverLogs={serverLogs}
          networkRequests={networkRequests}
          selectedEventId={selectedEvent?.id}
          selectedUserName={selectedSession?.userName}
          selectedTraceId={selectedEvent?.traceId}
          allUserTraceIds={timeline.map(e => e.traceId).filter(Boolean) as string[]}
          isLoading={loadingDetails}
          hasActiveSelection={!!selectedEvent}
          onClearSelection={() => setSelectedEvent(null)}
        />
      }
    />
  );
}
