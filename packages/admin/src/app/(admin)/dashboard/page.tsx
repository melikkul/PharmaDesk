'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import * as signalR from '@microsoft/signalr';

// Types
interface DashboardStats {
  totalPharmacies: number;
  totalDrugs: number;
  pendingApprovals: number;
  totalOffers: number;
  activeTransfers: number;
  activeUsers: number;
  totalGroups: number;
}

interface NetworkInterface {
  name: string;
  bytesSent: number;
  bytesReceived: number;
}

interface SystemMetrics {
  timestamp: string;
  cpu: {
    processorCount: number;
    processUptime: number;
  };
  memory: {
    processWorkingSetMb: number;
    systemTotalMb: number;
    systemAvailableMb: number;
    systemUsagePercent: number;
  };
  disk: {
    primaryUsagePercent: number;
    primaryFreeGb: number;
    primaryTotalGb: number;
  };
  network: {
    isConnected: boolean;
    interfaceCount: number;
    interfaces?: NetworkInterface[];
  };
  process: {
    threadCount: number;
    uptimeMinutes: number;
  };
  system: {
    osDescription: string;
    frameworkDescription: string;
    isDocker: boolean;
    machineName: string;
  };
}

// Stat Card Component
const StatCard = ({ 
  title, 
  value, 
  icon, 
  color,
  loading = false,
  link,
  badge
}: { 
  title: string;
  value: string | number;
  icon: string;
  color: string;
  loading?: boolean;
  link?: string;
  badge?: { text: string; color: string };
}) => {
  const content = (
    <div className={`bg-surface p-6 rounded-xl shadow-sm border border-border flex items-center justify-between hover:shadow-md transition-all duration-200 ${link ? 'cursor-pointer hover:border-primary/30' : ''}`}>
      <div>
        <p className="text-text-secondary text-sm font-medium mb-1">{title}</p>
        {loading ? (
          <div className="h-8 w-16 bg-background rounded animate-pulse" />
        ) : (
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-bold text-text-primary">{value}</h3>
            {badge && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                {badge.text}
              </span>
            )}
          </div>
        )}
      </div>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${color}`}>
        {icon}
      </div>
    </div>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }
  return content;
};

// Progress Bar Component
const ProgressBar = ({ value, max, color, label }: { value: number; max: number; color: string; label: string }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const getColor = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return color;
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-primary font-medium">{percentage.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-background rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor()} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Quick Action Button Component
const QuickAction = ({ href, icon, label, color }: { href: string; icon: string; label: string; color: string }) => (
  <Link 
    href={href}
    className={`flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-surface hover:shadow-md transition-all duration-200 hover:border-primary/30`}
  >
    <span className={`text-3xl mb-2 ${color}`}>{icon}</span>
    <span className="text-sm font-medium text-text-primary">{label}</span>
  </Link>
);

export default function AdminDashboardPage() {
  const { user, api } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineUserCount, setOnlineUserCount] = useState<number>(0);
  const [networkSpeed, setNetworkSpeed] = useState<{ download: number; upload: number }>({ download: 0, upload: 0 });
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const prevNetworkRef = useRef<{ bytesSent: number; bytesReceived: number; timestamp: number } | null>(null);

  // Calculate network speed from metrics
  const calculateNetworkSpeed = useCallback((metrics: SystemMetrics) => {
    if (!metrics.network?.interfaces?.length) return;
    
    const totalBytes = metrics.network.interfaces.reduce((acc, iface) => ({
      bytesSent: acc.bytesSent + (iface.bytesSent || 0),
      bytesReceived: acc.bytesReceived + (iface.bytesReceived || 0)
    }), { bytesSent: 0, bytesReceived: 0 });

    const now = Date.now();
    
    if (prevNetworkRef.current) {
      const timeDiff = (now - prevNetworkRef.current.timestamp) / 1000; // seconds
      if (timeDiff > 0) {
        const downloadSpeed = Math.max(0, (totalBytes.bytesReceived - prevNetworkRef.current.bytesReceived) / timeDiff / 1024); // KB/s
        const uploadSpeed = Math.max(0, (totalBytes.bytesSent - prevNetworkRef.current.bytesSent) / timeDiff / 1024); // KB/s
        setNetworkSpeed({ download: downloadSpeed, upload: uploadSpeed });
      }
    }

    prevNetworkRef.current = { ...totalBytes, timestamp: now };
  }, []);

  // Fetch dashboard stats
  const fetchData = useCallback(async () => {
    try {
      const [statsRes, metricsRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/systemmetrics').catch(() => ({ data: null }))
      ]);
      setStats(statsRes.data);
      if (metricsRes.data) {
        setSystemMetrics(metricsRes.data);
        calculateNetworkSpeed(metricsRes.data);
      }
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [api, calculateNetworkSpeed]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 seconds for network speed updates
  useEffect(() => {
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // SignalR connection for real-time online users (only counts pharmacy users, not admins)
  useEffect(() => {
    let isMounted = true;
    
    const connectSignalR = async () => {
      try {
        const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
        
        const connection = new signalR.HubConnectionBuilder()
          .withUrl('http://localhost:8081/hubs/notifications', {
            accessTokenFactory: () => token || '',
            withCredentials: true
          })
          .withAutomaticReconnect()
          .configureLogging(signalR.LogLevel.Warning)
          .build();

        // This only receives PharmacyIds (users), not admin IDs
        connection.on('ReceiveOnlineUsers', (users: string[]) => {
          if (isMounted) {
            setOnlineUserCount(users.length);
          }
        });

        await connection.start();
        connectionRef.current = connection;
      } catch (err) {
        console.warn('[Dashboard] SignalR connection failed:', err);
      }
    };

    connectSignalR();

    return () => {
      isMounted = false;
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, []);

  const formatUptime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} dk`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours < 24) return `${hours} sa ${mins} dk`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} gün ${remainingHours} sa`;
  };

  const formatSpeed = (kbps: number) => {
    if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} MB/s`;
    return `${kbps.toFixed(0)} KB/s`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">
            Hoş geldiniz, {user?.email}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => fetchData()}
            className="px-4 py-2 bg-surface border border-border rounded-lg text-text-secondary hover:text-primary transition-colors text-sm font-medium"
          >
            🔄 Yenile
          </button>
        </div>
      </div>
      
      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Toplam Eczane" 
          value={stats?.totalPharmacies ?? '-'} 
          icon="🏥" 
          color="bg-blue-50 text-blue-600"
          loading={loading}
          link="/users"
        />
        <StatCard 
          title="Toplam İlaç" 
          value={stats?.totalDrugs?.toLocaleString('tr-TR') ?? '-'} 
          icon="💊" 
          color="bg-green-50 text-green-600"
          loading={loading}
          link="/drugs"
        />
        <StatCard 
          title="Bekleyen Onaylar" 
          value={stats?.pendingApprovals ?? '-'} 
          icon="⏳" 
          color="bg-yellow-50 text-yellow-600"
          loading={loading}
          link="/approvals"
          badge={stats?.pendingApprovals && stats.pendingApprovals > 0 ? { text: 'Yeni', color: 'bg-yellow-100 text-yellow-700' } : undefined}
        />
        <StatCard 
          title="Aktif Transferler" 
          value={stats?.activeTransfers ?? '-'} 
          icon="📦" 
          color="bg-purple-50 text-purple-600"
          loading={loading}
          link="/cargo"
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Toplam Teklifler" 
          value={stats?.totalOffers ?? '-'} 
          icon="🏷️" 
          color="bg-indigo-50 text-indigo-600"
          loading={loading}
          link="/offers"
        />
        <StatCard 
          title="Anlık Online Kullanıcı" 
          value={onlineUserCount} 
          icon="🟢" 
          color="bg-emerald-50 text-emerald-600"
          loading={false}
          badge={{ text: 'Sadece Eczane', color: 'bg-emerald-100 text-emerald-700' }}
        />
        <StatCard 
          title="Grup Sayısı" 
          value={stats?.totalGroups ?? '-'} 
          icon="🏢" 
          color="bg-amber-50 text-amber-600"
          loading={loading}
          link="/groups"
        />
      </div>

      {/* Server Status Panel */}
      <div className="bg-surface p-6 rounded-xl shadow-sm border border-border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-text-primary">🖥️ Sunucu Durumu</h3>
          {systemMetrics && (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${systemMetrics.network?.isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
              <span className="text-xs text-text-secondary">
                {systemMetrics.network?.isConnected ? 'Çevrimiçi' : 'Çevrimdışı'}
              </span>
            </div>
          )}
        </div>

        {loading && !systemMetrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-background rounded w-1/2 animate-pulse" />
                <div className="h-2 bg-background rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : systemMetrics ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* RAM Usage */}
              <div className="p-4 bg-background rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">💾</span>
                  <span className="font-medium text-text-primary">RAM</span>
                </div>
                <ProgressBar 
                  value={systemMetrics.memory?.systemUsagePercent || 0} 
                  max={100} 
                  color="bg-blue-500"
                  label={`${systemMetrics.memory?.systemAvailableMb || 0} MB boş`}
                />
                <p className="text-xs text-text-tertiary mt-2">
                  Uygulama: {systemMetrics.memory?.processWorkingSetMb || 0} MB
                </p>
              </div>

              {/* Disk Usage */}
              <div className="p-4 bg-background rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">💿</span>
                  <span className="font-medium text-text-primary">Disk</span>
                </div>
                <ProgressBar 
                  value={systemMetrics.disk?.primaryUsagePercent || 0} 
                  max={100} 
                  color="bg-purple-500"
                  label={`${systemMetrics.disk?.primaryFreeGb || 0} GB boş`}
                />
              </div>

              {/* Network Status */}
              <div className="p-4 bg-background rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🌐</span>
                  <span className="font-medium text-text-primary">Ağ Durumu</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-3 h-3 rounded-full ${systemMetrics.network?.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className={`font-medium ${systemMetrics.network?.isConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {systemMetrics.network?.isConnected ? 'Bağlı' : 'Bağlantı Yok'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/50">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-text-tertiary uppercase tracking-wider">İndirme</span>
                    <div className="flex items-center gap-1 text-blue-600">
                      <span className="text-xs">↓</span>
                      <span className="font-mono font-medium text-sm">{formatSpeed(networkSpeed.download)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-text-tertiary uppercase tracking-wider">Yükleme</span>
                    <div className="flex items-center gap-1 text-green-600">
                      <span className="text-xs">↑</span>
                      <span className="font-mono font-medium text-sm">{formatSpeed(networkSpeed.upload)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Info */}
              <div className="p-4 bg-background rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">⚡</span>
                  <span className="font-medium text-text-primary">Sistem</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p className="text-text-secondary">
                    <span className="font-medium">Uptime:</span> {formatUptime(systemMetrics.process?.uptimeMinutes || 0)}
                  </p>
                  <p className="text-text-secondary">
                    <span className="font-medium">Threads:</span> {systemMetrics.process?.threadCount || 0}
                  </p>
                  <p className="text-text-secondary">
                    <span className="font-medium">CPU:</span> {systemMetrics.cpu?.processorCount || 0} çekirdek
                  </p>
                </div>
              </div>
            </div>

            {/* System Details */}
            <div className="pt-4 border-t border-border">
              <div className="flex flex-wrap gap-4 text-xs text-text-tertiary">
                <span>
                  {systemMetrics.system?.isDocker ? '🐳 Docker' : '💻 Yerel'} | 
                  {systemMetrics.system?.machineName}
                </span>
                <span>OS: {systemMetrics.system?.osDescription?.substring(0, 40)}...</span>
                <span>.NET: {systemMetrics.system?.frameworkDescription}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-text-secondary">
            <span className="text-3xl mb-2 block">⚠️</span>
            <p>Sunucu metrikleri alınamadı</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-surface p-6 rounded-xl shadow-sm border border-border">
        <h3 className="text-lg font-bold text-text-primary mb-4">Hızlı Erişim</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <QuickAction href="/users" icon="🏥" label="Eczaneler" color="text-blue-500" />
          <QuickAction href="/offers" icon="🏷️" label="Teklifler" color="text-purple-500" />
          <QuickAction href="/transactions" icon="💰" label="İşlemler" color="text-amber-500" />
          <QuickAction href="/drugs" icon="💊" label="İlaçlar" color="text-red-500" />
          <QuickAction href="/cargo" icon="🚚" label="Kargo" color="text-indigo-500" />
        </div>
      </div>
    </div>
  );
}