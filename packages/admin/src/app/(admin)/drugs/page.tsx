'use client';

import React from 'react';

export default function DrugsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">İlaç Yönetimi</h1>
        <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-sm">
          Yeni İlaç Ekle
        </button>
      </div>

      <div className="bg-surface rounded-xl shadow-sm border border-border p-8 text-center">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
          💊
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">İlaç Listesi Hazırlanıyor</h3>
        <p className="text-text-secondary max-w-md mx-auto">
          Bu modül henüz geliştirme aşamasındadır. Yakında tüm ilaç veritabanını buradan yönetebileceksiniz.
        </p>
      </div>
    </div>
  );
}