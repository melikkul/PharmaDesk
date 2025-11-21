'use client';

import React from 'react';

export default function GroupsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Grup Yönetimi</h1>
        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-sm">
          Yeni Grup Oluştur
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['Ankara Grubu', 'İstanbul Anadolu', 'İzmir Eczacıları'].map((group, i) => (
          <div key={i} className="bg-surface rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-lg flex items-center justify-center text-xl">
                🏢
              </div>
              <span className="px-2 py-1 bg-success/10 text-success text-xs font-medium rounded">Aktif</span>
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-1 group-hover:text-primary transition-colors">{group}</h3>
            <p className="text-text-secondary text-sm">24 Eczane Üye</p>
            
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <div className="flex -space-x-2">
                {[1,2,3].map(j => (
                  <div key={j} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-500">
                    U{j}
                  </div>
                ))}
              </div>
              <button className="text-sm text-primary font-medium hover:underline">Detaylar →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}