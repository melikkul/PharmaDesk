'use client';

import React from 'react';

export default function UsersPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Kullanıcı Yönetimi</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Kullanıcı listesi burada görüntülenecek.</p>
        {/* İleride buraya tablo eklenebilir */}
      </div>
    </div>
  );
}
