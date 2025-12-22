'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface TimelineEvent {
  id: number;
  timestamp: string;
  action: string;
  entityName: string;
  entityId: number | null;
  logType: string | null;
  httpMethod: string | null;
  requestPath: string | null;
  httpStatusCode: number | null;
  durationMs: number | null;
  isSuccess: boolean;
  errorMessage: string | null;
  userId: number | null;
  userName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  clientLogs: unknown;
  serverLogs: unknown;
  performanceMetrics: unknown;
  clientMetadata: unknown;
  oldValues: unknown;
  newValues: unknown;
  changedProperties: string[] | null;
}

interface TraceData {
  traceId: string;
  sessionDurationMs: number;
  startTime: string;
  endTime: string;
  totalEvents: number;
  errorCount: number;
  user: {
    userId: number | null;
    userName: string | null;
    ipAddress: string | null;
  };
  clientMetadata: Record<string, unknown> | null;
  timeline: TimelineEvent[];
}

// ═══════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════

const ConsoleViewer = ({ logs }: { logs: unknown }) => {
  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    return <div className="text-text-secondary text-sm italic">Client logları yok</div>;
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm max-h-[300px] overflow-auto">
      {logs.map((log: { level?: string; message?: string; timestamp?: number }, index: number) => {
        const levelColors: Record<string, string> = {
          log: 'text-gray-300',
          info: 'text-blue-400',
          warn: 'text-yellow-400',
          error: 'text-red-400',
          debug: 'text-purple-400',
        };
        const color = levelColors[log.level || 'log'] || 'text-gray-300';
        const time = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('tr-TR') : '';

        return (
          <div key={index} className={`${color} py-0.5`}>
            <span className="text-gray-500 mr-2">[{time}]</span>
            <span className="text-gray-400 mr-2">[{log.level?.toUpperCase() || 'LOG'}]</span>
            {log.message || JSON.stringify(log)}
          </div>
        );
      })}
    </div>
  );
};

const ServerLogViewer = ({ logs, error }: { logs: unknown; error: string | null }) => {
  const hasLogs = logs !== null && logs !== undefined;
  
  if (!hasLogs && !error) {
    return <div className="text-text-secondary text-sm italic">Server logları yok</div>;
  }

  const logsContent = hasLogs 
    ? (typeof logs === 'string' ? logs : JSON.stringify(logs, null, 2))
    : null;

  return (
    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm max-h-[300px] overflow-auto">
      {error && (
        <div className="text-red-400 mb-2">
          <span className="font-bold">[ERROR]</span> {error}
        </div>
      )}
      {logsContent && (
        <pre className="text-gray-300 whitespace-pre-wrap">
          {logsContent}
        </pre>
      )}
    </div>
  );
};

const JsonViewer = ({ data, title }: { data: unknown; title: string }) => {
  const [expanded, setExpanded] = useState(false);

  if (!data) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 bg-background flex items-center justify-between text-sm font-medium text-text-primary hover:bg-surface transition-colors"
      >
        <span>{title}</span>
        <span>{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && (
        <pre className="p-4 bg-gray-50 text-sm font-mono overflow-auto max-h-[200px]">
          {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
};

const TimelineItem = ({ event, isSelected, onClick }: { event: TimelineEvent; isSelected: boolean; onClick: () => void }) => {
  const isError = !event.isSuccess || (event.httpStatusCode && event.httpStatusCode >= 400);
  
  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 p-3 cursor-pointer transition-colors rounded-lg ${
        isSelected ? 'bg-primary/10 border-l-4 border-primary' : 'hover:bg-background'
      }`}
    >
      <div className="relative">
        <div className={`w-3 h-3 rounded-full mt-1 ${isError ? 'bg-red-500' : 'bg-green-500'}`} />
        <div className="absolute top-4 left-1.5 w-0.5 h-full bg-border -z-10" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">
            {new Date(event.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
          </span>
          {event.httpMethod && (
            <span className="text-xs font-mono text-primary bg-primary/10 px-1 rounded">
              {event.httpMethod}
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-text-primary truncate">
          {event.action}
        </p>
        <p className="text-xs text-text-secondary truncate">
          {event.requestPath || event.entityName}
        </p>
        {event.durationMs && (
          <span className="text-xs text-text-secondary">{event.durationMs}ms</span>
        )}
      </div>
      {event.httpStatusCode && (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
          event.httpStatusCode >= 400 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {event.httpStatusCode}
        </span>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════════

export default function SessionReplayPage() {
  const { api } = useAuth();
  const params = useParams();
  const router = useRouter();
  const traceId = params.traceId as string;

  const [data, setData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  useEffect(() => {
    const fetchTrace = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/admin/audit/logs/${traceId}`);
        setData(response.data);
        if (response.data.timeline.length > 0) {
          setSelectedEvent(response.data.timeline[0]);
        }
      } catch (err) {
        console.error('Failed to fetch trace:', err);
        setError('Trace bulunamadı veya yüklenemedi.');
      } finally {
        setLoading(false);
      }
    };

    if (traceId) {
      fetchTrace();
    }
  }, [traceId, api]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-secondary">Yükleniyor...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-surface p-8 rounded-xl border border-border text-center">
        <p className="text-red-500 mb-4">{error || 'Veri bulunamadı'}</p>
        <button
          onClick={() => router.push('/debug-logs')}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
        >
          ← Geri Dön
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/debug-logs')}
            className="text-primary hover:underline text-sm mb-2 flex items-center gap-1"
          >
            ← Debug Logs
          </button>
          <h1 className="text-2xl font-bold text-text-primary">🎬 Session Replay</h1>
          <p className="text-text-secondary text-sm mt-1 font-mono">
            TraceId: {traceId}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-border">
          <p className="text-xs text-text-secondary">Oturum Süresi</p>
          <p className="text-lg font-bold text-text-primary">
            {Math.round(data.sessionDurationMs)}ms
          </p>
        </div>
        <div className="bg-surface p-4 rounded-xl border border-border">
          <p className="text-xs text-text-secondary">Toplam Olay</p>
          <p className="text-lg font-bold text-text-primary">{data.totalEvents}</p>
        </div>
        <div className={`bg-surface p-4 rounded-xl border ${data.errorCount > 0 ? 'border-red-200' : 'border-border'}`}>
          <p className="text-xs text-text-secondary">Hatalar</p>
          <p className={`text-lg font-bold ${data.errorCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {data.errorCount}
          </p>
        </div>
        <div className="bg-surface p-4 rounded-xl border border-border">
          <p className="text-xs text-text-secondary">Kullanıcı</p>
          <p className="text-lg font-bold text-text-primary truncate">
            {data.user.userName || data.user.ipAddress || 'Anonymous'}
          </p>
        </div>
      </div>

      {/* Main Content: Timeline + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline (Left) */}
        <div className="lg:col-span-1 bg-surface rounded-xl border border-border p-4 max-h-[600px] overflow-y-auto">
          <h2 className="text-lg font-bold text-text-primary mb-4">📅 Zaman Çizelgesi</h2>
          <div className="space-y-1">
            {data.timeline.map((event) => (
              <TimelineItem
                key={event.id}
                event={event}
                isSelected={selectedEvent?.id === event.id}
                onClick={() => setSelectedEvent(event)}
              />
            ))}
          </div>
        </div>

        {/* Detail Panel (Right) */}
        <div className="lg:col-span-2 space-y-4">
          {selectedEvent ? (
            <>
              {/* Event Header */}
              <div className="bg-surface rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-text-primary">
                    {selectedEvent.action}
                  </h2>
                  <span className={`px-2 py-1 rounded text-sm font-bold ${
                    selectedEvent.isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedEvent.httpStatusCode || (selectedEvent.isSuccess ? 'SUCCESS' : 'ERROR')}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-text-secondary">Zaman:</span>
                    <p className="text-text-primary">{new Date(selectedEvent.timestamp).toLocaleString('tr-TR')}</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Süre:</span>
                    <p className="text-text-primary">{selectedEvent.durationMs || '-'}ms</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">Path:</span>
                    <p className="text-text-primary font-mono text-xs truncate">{selectedEvent.requestPath || '-'}</p>
                  </div>
                  <div>
                    <span className="text-text-secondary">IP:</span>
                    <p className="text-text-primary font-mono text-xs">{selectedEvent.ipAddress || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Console Logs */}
              <div className="bg-surface rounded-xl border border-border p-4">
                <h3 className="text-md font-bold text-text-primary mb-3">🖥️ Konsol Çıktısı</h3>
                <ConsoleViewer logs={selectedEvent.clientLogs} />
              </div>

              {/* Server Logs */}
              <div className="bg-surface rounded-xl border border-border p-4">
                <h3 className="text-md font-bold text-text-primary mb-3">🔧 Sunucu Logları</h3>
                <ServerLogViewer logs={selectedEvent.serverLogs} error={selectedEvent.errorMessage} />
              </div>

              {/* Additional Data */}
              <div className="space-y-2">
                <JsonViewer data={selectedEvent.performanceMetrics} title="📊 Performance Metrics" />
                <JsonViewer data={selectedEvent.oldValues} title="📝 Eski Değerler" />
                <JsonViewer data={selectedEvent.newValues} title="📝 Yeni Değerler" />
                <JsonViewer data={selectedEvent.clientMetadata} title="📱 Client Metadata" />
              </div>
            </>
          ) : (
            <div className="bg-surface rounded-xl border border-border p-8 text-center text-text-secondary">
              Sol taraftan bir olay seçin.
            </div>
          )}
        </div>
      </div>

      {/* Client Metadata (Global) */}
      {data.clientMetadata && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-md font-bold text-text-primary mb-3">📱 Oturum Client Bilgileri</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {Object.entries(data.clientMetadata).slice(0, 8).map(([key, value]) => (
              <div key={key}>
                <span className="text-text-secondary">{key}:</span>
                <p className="text-text-primary truncate">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
