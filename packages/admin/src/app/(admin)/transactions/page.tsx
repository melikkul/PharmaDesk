'use client';

import React from 'react';

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Transfer Geçmişi</h1>
        <button className="px-4 py-2 bg-surface border border-border rounded-lg text-text-secondary hover:text-primary transition-colors text-sm font-medium">
          Excel İndir
        </button>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="p-4 font-semibold text-text-secondary text-sm">Tarih</th>
              <th className="p-4 font-semibold text-text-secondary text-sm">Gönderen</th>
              <th className="p-4 font-semibold text-text-secondary text-sm">Alıcı</th>
              <th className="p-4 font-semibold text-text-secondary text-sm">İşlem Tutarı</th>
              <th className="p-4 font-semibold text-text-secondary text-sm text-center">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[
              { date: '21.11.2025 14:30', sender: 'Merkez Eczane', receiver: 'Yeni Umut', amount: 2450.00, status: 'Başarılı' },
              { date: '21.11.2025 12:15', sender: 'Şifa Eczanesi', receiver: 'Anadolu Ecz', amount: 850.50, status: 'Bekliyor' },
              { date: '20.11.2025 09:45', sender: 'Körfez Eczane', receiver: 'Merkez Eczane', amount: 1200.00, status: 'Başarılı' },
            ].map((item, i) => (
              <tr key={i} className="hover:bg-background/50 transition-colors">
                <td className="p-4 text-text-secondary text-sm">{item.date}</td>
                <td className="p-4 font-medium text-text-primary">{item.sender}</td>
                <td className="p-4 font-medium text-text-primary">{item.receiver}</td>
                <td className="p-4 font-bold text-text-primary">{item.amount.toFixed(2)} ₺</td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    item.status === 'Başarılı' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                  }`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}