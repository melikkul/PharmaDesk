'use client';

import React from 'react';

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Onay Bekleyen Eczaneler</h1>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-warning/10 text-warning rounded-full text-sm font-medium">
            3 Bekleyen
          </span>
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="p-4 font-semibold text-text-secondary text-sm">Eczane Adı</th>
              <th className="p-4 font-semibold text-text-secondary text-sm">Başvuru Tarihi</th>
              <th className="p-4 font-semibold text-text-secondary text-sm">Şehir</th>
              <th className="p-4 font-semibold text-text-secondary text-sm">Belgeler</th>
              <th className="p-4 font-semibold text-text-secondary text-sm text-center">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[
              { name: 'Yeni Umut Eczanesi', date: '21.11.2025', city: 'Ankara', status: 'Bekliyor' },
              { name: 'Merkez Eczane', date: '20.11.2025', city: 'İstanbul', status: 'Bekliyor' },
              { name: 'Şifa Eczanesi', date: '19.11.2025', city: 'İzmir', status: 'İnceleniyor' },
            ].map((item, i) => (
              <tr key={i} className="hover:bg-background/50 transition-colors">
                <td className="p-4 font-medium text-text-primary">{item.name}</td>
                <td className="p-4 text-text-secondary">{item.date}</td>
                <td className="p-4 text-text-secondary">{item.city}</td>
                <td className="p-4">
                  <button className="text-primary hover:underline text-sm">Görüntüle</button>
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button className="p-2 bg-success/10 text-success rounded hover:bg-success hover:text-white transition-colors" title="Onayla">
                      ✓
                    </button>
                    <button className="p-2 bg-danger/10 text-danger rounded hover:bg-danger hover:text-white transition-colors" title="Reddet">
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
