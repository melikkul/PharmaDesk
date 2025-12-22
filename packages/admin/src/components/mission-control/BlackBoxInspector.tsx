'use client';

import React, { useState, useMemo, useEffect } from 'react';
import styles from './BlackBoxInspector.module.css';
import { useAuth } from '@/context/AuthContext';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

type TabType = 'browser' | 'server' | 'network' | 'docker';
type LogLevel = 'all' | 'info' | 'warn' | 'error';

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

interface DockerLogEntry {
  timestamp: string;
  level: string;
  message: string;
  container?: string;
}

interface BlackBoxInspectorProps {
  clientLogs: LogEntry[];
  serverLogs: LogEntry[];
  networkRequests: NetworkEntry[];
  selectedEventId?: number;
  selectedUserName?: string; // Filter Docker logs by this user
  selectedTraceId?: string | null; // Filter Docker logs by this traceId (highest priority)
  allUserTraceIds?: string[]; // All TraceIds from selected user's timeline
  isLoading?: boolean;
  hasActiveSelection?: boolean;
  onClearSelection?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

function formatBytes(bytes: number | undefined): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ═══════════════════════════════════════════════════════════════
// Container Config
// ═══════════════════════════════════════════════════════════════

const DOCKER_CONTAINERS = [
  { name: 'pharma_desk_backend', displayName: 'Backend API' },
  { name: 'pharma_desk_frontend_web', displayName: 'Frontend Web' },
  { name: 'pharma_desk_frontend_admin', displayName: 'Frontend Admin' },
  { name: 'pharma_desk_frontend_cargo', displayName: 'Frontend Cargo' },
  { name: 'pharma_desk_db', displayName: 'PostgreSQL' },
  { name: 'pharma_desk_scrapper', displayName: 'Scrapper Service' },
];

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════

export default function BlackBoxInspector({
  clientLogs,
  serverLogs,
  networkRequests,
  selectedUserName,
  selectedTraceId,
  allUserTraceIds = [],
  isLoading = false,
  hasActiveSelection = false,
  onClearSelection,
}: BlackBoxInspectorProps) {
  const { api } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('browser');
  const [levelFilter, setLevelFilter] = useState<LogLevel>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Docker-specific state
  const [selectedContainer, setSelectedContainer] = useState(DOCKER_CONTAINERS[0].name);
  const [dockerLogs, setDockerLogs] = useState<DockerLogEntry[]>([]);
  const [dockerLoading, setDockerLoading] = useState(false);
  const [dockerError, setDockerError] = useState<string | null>(null);

  // Fetch Docker logs when container changes or tab is Docker
  // Filtering logic:
  // - Event selected: server-side filter by single TraceId
  // - User selected (no event): fetch all, client-side filter by all user TraceIds
  // - Nothing selected: show all logs
  useEffect(() => {
    if (activeTab !== 'docker') return;
    
    const fetchDockerLogs = async () => {
      setDockerLoading(true);
      setDockerError(null);
      
      try {
        let url = `/api/admin/docker/logs/${selectedContainer}?tail=200`;
        
        // When specific event is selected, use server-side filter (fastest)
        if (selectedTraceId) {
          url += `&search=${encodeURIComponent(selectedTraceId)}`;
        }
        // Otherwise fetch all logs (will filter client-side if user is selected)
        
        const response = await api.get(url);
        let logs = response.data.logs || [];
        
        // Client-side filter: when user is selected but no specific event
        // Filter logs to only show those matching ANY of the user's TraceIds
        if (!selectedTraceId && allUserTraceIds.length > 0) {
          logs = logs.filter((log: DockerLogEntry) => {
            const logContent = log.message || '';
            return allUserTraceIds.some(traceId => logContent.includes(traceId));
          });
        }
        
        setDockerLogs(logs);
      } catch (error: unknown) {
        console.error('Failed to fetch Docker logs:', error);
        
        // Extract error details for better user feedback
        const axiosError = error as { response?: { status?: number; data?: { error?: string; details?: string } } };
        const status = axiosError.response?.status;
        const data = axiosError.response?.data;
        
        if (status === 404) {
          setDockerError(`Container bulunamadı: ${selectedContainer}. Container'ın çalıştığından emin olun.`);
        } else if (status === 401 || status === 403) {
          setDockerError('Docker loglarına erişim yetkisi yok. Lütfen tekrar giriş yapın.');
        } else if (status === 500) {
          setDockerError(`Docker socket'e bağlanılamadı: ${data?.details || data?.error || 'Docker socket mount edilmemiş olabilir'}`);
        } else if (status === 400) {
          setDockerError(`Geçersiz container adı: ${data?.error || selectedContainer}`);
        } else {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setDockerError(`Docker logları alınamadı: ${data?.error || errorMessage}`);
        }
        
        setDockerLogs([]);
      } finally {
        setDockerLoading(false);
      }
    };

    fetchDockerLogs();
    // Refresh every 10 seconds when Docker tab is active
    const interval = setInterval(fetchDockerLogs, 10000);
    return () => clearInterval(interval);
  }, [activeTab, selectedContainer, selectedTraceId, allUserTraceIds, api]);

  // Filter logs
  const filteredClientLogs = useMemo(() => {
    return clientLogs.filter(log => {
      if (levelFilter !== 'all' && log.level !== levelFilter) return false;
      if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [clientLogs, levelFilter, searchQuery]);

  const filteredServerLogs = useMemo(() => {
    return serverLogs.filter(log => {
      if (levelFilter !== 'all' && log.level !== levelFilter) return false;
      if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [serverLogs, levelFilter, searchQuery]);

  const filteredNetwork = useMemo(() => {
    return networkRequests.filter(req => {
      if (searchQuery && !req.url.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [networkRequests, searchQuery]);

  const filteredDockerLogs = useMemo(() => {
    return dockerLogs.filter(log => {
      if (levelFilter !== 'all' && log.level !== levelFilter) return false;
      if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [dockerLogs, levelFilter, searchQuery]);

  // Error counts for badges
  const clientErrorCount = clientLogs.filter(l => l.level === 'error').length;
  const serverErrorCount = serverLogs.filter(l => l.level === 'error').length;
  const networkErrorCount = networkRequests.filter(r => r.status >= 400).length;
  const dockerErrorCount = dockerLogs.filter(l => l.level === 'error').length;

  // Copy to clipboard
  const handleCopy = () => {
    let content = '';
    if (activeTab === 'browser') {
      content = filteredClientLogs.map(l => `[${l.level}] ${l.message}`).join('\n');
    } else if (activeTab === 'server') {
      content = filteredServerLogs.map(l => `[${l.level}] ${l.message}`).join('\n');
    } else if (activeTab === 'docker') {
      content = filteredDockerLogs.map(l => `[${l.level}] ${l.message}`).join('\n');
    } else {
      content = filteredNetwork.map(r => `${r.method} ${r.url} → ${r.status} (${r.durationMs}ms)`).join('\n');
    }
    navigator.clipboard.writeText(content);
  };

  const handleClear = () => {
    setSearchQuery('');
    setLevelFilter('all');
  };

  return (
    <div className={styles.inspector}>
      {/* Tab Bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'browser' ? styles.active : ''}`}
          onClick={() => setActiveTab('browser')}
        >
          <span className={styles.tabIcon}>🖥️</span>
          Browser
          {clientErrorCount > 0 && (
            <span className={styles.tabBadge}>{clientErrorCount}</span>
          )}
        </button>
        
        <button
          className={`${styles.tab} ${activeTab === 'server' ? styles.active : ''}`}
          onClick={() => setActiveTab('server')}
        >
          <span className={styles.tabIcon}>🔧</span>
          Server
          {serverErrorCount > 0 && (
            <span className={styles.tabBadge}>{serverErrorCount}</span>
          )}
        </button>
        
        <button
          className={`${styles.tab} ${activeTab === 'network' ? styles.active : ''}`}
          onClick={() => setActiveTab('network')}
        >
          <span className={styles.tabIcon}>🌊</span>
          Network
          {networkErrorCount > 0 && (
            <span className={styles.tabBadge}>{networkErrorCount}</span>
          )}
        </button>

        <button
          className={`${styles.tab} ${activeTab === 'docker' ? styles.active : ''}`}
          onClick={() => setActiveTab('docker')}
        >
          <span className={styles.tabIcon}>🐳</span>
          Docker
          {dockerErrorCount > 0 && (
            <span className={styles.tabBadge}>{dockerErrorCount}</span>
          )}
        </button>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        {/* Docker container selector */}
        {activeTab === 'docker' && (
          <>
            <select
              className={styles.containerSelect}
              value={selectedContainer}
              onChange={(e) => setSelectedContainer(e.target.value)}
            >
              {DOCKER_CONTAINERS.map(c => (
                <option key={c.name} value={c.name}>{c.displayName}</option>
              ))}
            </select>
            {/* Filter badge - shows current filter type */}
            {selectedTraceId ? (
              <span className={styles.filterBadge} title="Request TraceId ile filtreleniyor">
                🎯 TraceId: {selectedTraceId.substring(0, 8)}...
              </span>
            ) : allUserTraceIds.length > 0 ? (
              <span className={styles.filterBadge} title={`${selectedUserName} kullanıcısının ${allUserTraceIds.length} request'i`}>
                👤 {selectedUserName} ({allUserTraceIds.length} request)
              </span>
            ) : (
              <span className={styles.filterBadgeAll} title="Tüm loglar gösteriliyor">
                📋 Tümü
              </span>
            )}
          </>
        )}

        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {activeTab !== 'network' && (
          <div className={styles.levelFilters}>
            {(['all', 'info', 'warn', 'error'] as LogLevel[]).map(level => (
              <button
                key={level}
                className={`${styles.levelBtn} ${styles[level]} ${levelFilter === level ? styles.active : ''}`}
                onClick={() => setLevelFilter(level)}
              >
                {level}
              </button>
            ))}
          </div>
        )}

        <div className={styles.actionBtns}>
          {hasActiveSelection && onClearSelection && (
            <button 
              className={`${styles.actionBtn} ${styles.clearSelection}`} 
              onClick={onClearSelection} 
              title="Trace filtresini temizle ve tüm oturum loglarını göster"
            >
              ✕ Filtreyi Kaldır
            </button>
          )}
          <button className={styles.actionBtn} onClick={handleCopy} title="Copy">
            📋
          </button>
          <button className={styles.actionBtn} onClick={handleClear} title="Clear filters">
            🗑️
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.terminalContent}>
        {isLoading && (
          <div className={styles.emptyTerminal}>
            <span>⏳</span>
            <p>Loading logs...</p>
          </div>
        )}
        
        {!isLoading && activeTab === 'browser' && (
          filteredClientLogs.length > 0 ? (
            filteredClientLogs.map((log, index) => (
              <div key={index} className={styles.logEntry}>
                <span className={styles.logTime}>{formatTime(log.timestamp)}</span>
                <span className={`${styles.logLevel} ${styles[log.level]}`}>{log.level}</span>
                <span className={`${styles.logMessage} ${log.level === 'error' ? styles.error : ''}`}>
                  {log.message}
                </span>
              </div>
            ))
          ) : (
            <div className={styles.emptyTerminal}>
              <span>🖥️</span>
              <p>{hasActiveSelection ? 'Bu event için browser logu bulunamadı' : 'Bir kullanıcı veya event seçin'}</p>
              {hasActiveSelection && onClearSelection && (
                <button 
                  className={styles.showAllBtn}
                  onClick={onClearSelection}
                >
                  🔄 Tüm oturum loglarını göster
                </button>
              )}
            </div>
          )
        )}

        {!isLoading && activeTab === 'server' && (
          filteredServerLogs.length > 0 ? (
            filteredServerLogs.map((log, index) => (
              <div key={index} className={styles.logEntry}>
                <span className={styles.logTime}>{formatTime(log.timestamp)}</span>
                <span className={`${styles.logLevel} ${styles[log.level]}`}>{log.level}</span>
                <span className={`${styles.logMessage} ${log.level === 'error' ? styles.error : ''}`}>
                  {log.message}
                </span>
              </div>
            ))
          ) : (
            <div className={styles.emptyTerminal}>
              <span>🔧</span>
              <p>{hasActiveSelection ? 'Bu event için server logu bulunamadı' : 'Bir event seçin'}</p>
            </div>
          )
        )}

        {!isLoading && activeTab === 'network' && (
          filteredNetwork.length > 0 ? (
            filteredNetwork.map((req, index) => (
              <div key={index} className={styles.networkEntry}>
                <span className={`${styles.networkMethod} ${styles[req.method]}`}>
                  {req.method}
                </span>
                <span className={`${styles.networkStatus} ${req.status < 400 ? styles.success : styles.error}`}>
                  {req.status}
                </span>
                <span className={styles.networkUrl} title={req.url}>
                  {req.url}
                </span>
                <span className={styles.networkDuration}>{req.durationMs}ms</span>
                <span className={styles.networkSize}>{formatBytes(req.size)}</span>
              </div>
            ))
          ) : (
            <div className={styles.emptyTerminal}>
              <span>🌊</span>
              <p>No network requests captured</p>
            </div>
          )
        )}

        {/* Docker Logs Tab */}
        {activeTab === 'docker' && (
          dockerLoading ? (
            <div className={styles.emptyTerminal}>
              <span>⏳</span>
              <p>Docker logları yükleniyor...</p>
            </div>
          ) : dockerError ? (
            <div className={styles.emptyTerminal}>
              <span>⚠️</span>
              <p>{dockerError}</p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                Docker socket&apos;in mount edildiğinden emin olun
              </p>
            </div>
          ) : filteredDockerLogs.length > 0 ? (
            filteredDockerLogs.map((log, index) => (
              <div key={index} className={styles.logEntry}>
                <span className={styles.logTime}>{formatTime(log.timestamp)}</span>
                <span className={`${styles.logLevel} ${styles[log.level] || styles.log}`}>{log.level}</span>
                <span className={`${styles.logMessage} ${log.level === 'error' ? styles.error : ''}`}>
                  {log.message}
                </span>
              </div>
            ))
          ) : (
            <div className={styles.emptyTerminal}>
              <span>🐳</span>
              <p>Bu container için log bulunamadı</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
