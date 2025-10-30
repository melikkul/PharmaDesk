'use client';
import React from 'react';
import { useAuth } from '@/context/AuthContext';

export default function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="pageTitle">Hoş Geldiniz, {user?.email}</h1>
      <p>Burası admin dashboard ana sayfası. Buraya özet istatistikler gelecek.</p>
    </div>
  );
}