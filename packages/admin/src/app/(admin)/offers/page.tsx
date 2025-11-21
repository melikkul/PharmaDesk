'use client';

import React from 'react';

export default function OffersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Tüm Teklifler</h1>
        <div className="flex gap-3">
          <select className="px-4 py-2 rounded-lg border border-border focus:border-primary outline-none bg-surface">
            <option>Tüm Kategoriler</option>
            <option>Antibiyotikler</option>
            <option>Ağrı Kesiciler</option>
          </select>
          <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-sm">
            Filtrele
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="p-4 font-semibold text-text-secondary text-sm">Teklif ID</th>
              <th className="p-4 font-semibold text-text-secondary text-sm">Eczane</th>
              <th className="p-4 font-semibold text-text-secondary text-sm">İlaç</th>
              <th className="p-4 font-semibold text-text-secondary text-sm text-right">Miktar</th>
              <th className="p-4 font-semibold text-text-secondary text-sm text-right">Fiyat</th>
              <th className="p-4 font-semibold text-text-secondary text-sm text-center">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[
              { id: '#T-1234', pharmacy: 'Merkez Eczane', drug: 'Parol 500mg', amount: 50, price: 45.50, status: 'Aktif' },
              { id: '#T-1235', pharmacy: 'Yeni Umut', drug: 'Augmentin 1000mg', amount: 20, price: 120.00, status: 'Tamamlandı' },
              { id: '#T-1236', pharmacy: 'Şifa Eczanesi', drug: 'Majezik', amount: 100, price: 85.00, status: 'Aktif' },
            ].map((item, i) => (
              <tr key={i} className="hover:bg-background/50 transition-colors">
                <td className="p-4 font-medium text-primary">{item.id}</td>
                <td className="p-4 text-text-primary">{item.pharmacy}</td>
                <td className="p-4 text-text-primary">{item.drug}</td>
                <td className="p-4 text-right text-text-secondary">{item.amount} kutu</td>
                <td className="p-4 text-right font-bold text-text-primary">{item.price.toFixed(2)} ₺</td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    item.status === 'Aktif' ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500'
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