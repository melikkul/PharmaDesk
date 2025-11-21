'use client';
import React from 'react';
import { useAuth } from '@/context/AuthContext';

const StatCard = ({ title, value, icon, color }: { title: string, value: string | number, icon: string, color: string }) => (
  <div className="bg-surface p-6 rounded-xl shadow-sm border border-border flex items-center justify-between hover:shadow-md transition-shadow duration-200">
    <div>
      <p className="text-text-secondary text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-text-primary">{value}</h3>
    </div>
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${color}`}>
      {icon}
    </div>
  </div>
);

export default function AdminDashboardPage() {
  const { user, api } = useAuth();
  const [stats, setStats] = React.useState<any>(null);

  React.useEffect(() => {
    api.get('/admin/stats')
       .then(res => setStats(res.data))
       .catch(err => console.error("Stats fetch error:", err));
  }, [api]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">Hoş geldiniz, {user?.email}</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-surface border border-border rounded-lg text-text-secondary hover:text-primary transition-colors text-sm font-medium">
            Rapor İndir
          </button>
          <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium shadow-sm">
            Yeni Ekle
          </button>
        </div>
      </div>
      
      {stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Toplam Eczane" 
            value={stats.totalPharmacies} 
            icon="🏥" 
            color="bg-blue-50 text-blue-600"
          />
          <StatCard 
            title="Toplam İlaç" 
            value={stats.totalDrugs} 
            icon="💊" 
            color="bg-green-50 text-green-600"
          />
          <StatCard 
            title="Bekleyen Onaylar" 
            value={stats.pendingApprovals} 
            icon="⏳" 
            color="bg-yellow-50 text-yellow-600"
          />
           <StatCard 
            title="Aktif Transferler" 
            value="12" 
            icon="📦" 
            color="bg-purple-50 text-purple-600"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface h-32 rounded-xl border border-border"></div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface p-6 rounded-xl shadow-sm border border-border">
          <h3 className="text-lg font-bold text-text-primary mb-4">Son Aktiviteler</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 hover:bg-background rounded-lg transition-colors cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  E
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">Yeni Eczane Kaydı</p>
                  <p className="text-xs text-text-secondary">2 dakika önce</p>
                </div>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">Yeni</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface p-6 rounded-xl shadow-sm border border-border">
          <h3 className="text-lg font-bold text-text-primary mb-4">Sistem Durumu</h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Sunucu Yükü</span>
                <span className="text-sm font-medium text-success">Normal (%24)</span>
             </div>
             <div className="w-full bg-background rounded-full h-2">
                <div className="bg-success h-2 rounded-full" style={{ width: '24%' }}></div>
             </div>

             <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-text-secondary">Veritabanı Bağlantıları</span>
                <span className="text-sm font-medium text-warning">Yüksek (%78)</span>
             </div>
             <div className="w-full bg-background rounded-full h-2">
                <div className="bg-warning h-2 rounded-full" style={{ width: '78%' }}></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}