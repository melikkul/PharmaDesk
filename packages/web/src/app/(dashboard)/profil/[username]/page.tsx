// src/app/(dashboard)/profil/[username]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import Link from 'next/link';

// Simple safe components defined locally to avoid import issues initially
const ProfileHeader = ({ pharmacy, isOwnProfile }: { pharmacy: any, isOwnProfile: boolean }) => {
  if (!pharmacy) return null;
  
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6" style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', backgroundColor: 'var(--card-bg, #fff)' }}>
      {/* Cover Photo */}
      <div style={{ 
        height: '200px', 
        backgroundColor: '#e9ecef',
        backgroundImage: pharmacy.coverImageUrl ? `url(${pharmacy.coverImageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }} />
      
      <div style={{ padding: '0 30px 20px', display: 'flex', alignItems: 'flex-end', marginTop: '-60px', position: 'relative' }}>
        {/* Avatar */}
        <div style={{ 
          width: '120px', 
          height: '120px', 
          borderRadius: '50%', 
          border: '4px solid white',
          backgroundColor: '#fff',
          backgroundImage: pharmacy.logoUrl ? `url(${pharmacy.logoUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px',
          color: '#666',
          fontWeight: 'bold'
        }}>
          {!pharmacy.logoUrl && (pharmacy.pharmacyName?.charAt(0) || '?')}
        </div>
        
        {/* Info */}
        <div style={{ marginLeft: '20px', marginBottom: '10px' }}>
          <h1 style={{ margin: '0', fontSize: '24px', fontWeight: 'bold' }}>{pharmacy.pharmacyName || 'Eczane İsmi Yok'}</h1>
          <p style={{ margin: '5px 0 0', color: '#666' }}>{pharmacy.pharmacistInCharge || 'Eczacı Bilgisi Yok'}</p>
        </div>

        {/* Actions */}
        <div style={{ marginLeft: 'auto', marginBottom: '10px' }}>
            {isOwnProfile ? (
                <Link href="/ayarlar/eczane" style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#f8f9fa', 
                    border: '1px solid #dee2e6', 
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: '#333',
                    fontWeight: '500'
                }}>
                    Profili Düzenle
                </Link>
            ) : (
                <button style={{ 
                    padding: '8px 16px', 
                    backgroundColor: '#0d6efd', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                }} onClick={() => console.log('Message clicked')}>
                    Mesaj Gönder
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

const ProfileInfoCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div style={{ 
        backgroundColor: 'var(--card-bg, #fff)', 
        borderRadius: '12px', 
        padding: '20px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        marginBottom: '20px'
    }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>{title}</h3>
        {children}
    </div>
);

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const { user } = useAuth();
  const { profile, loading, error } = useProfile(params.username);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Yükleniyor...</div>;
  }

  if (error || !profile) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>Profil bulunamadı veya bir hata oluştu.</div>;
  }

  const isOwnProfile = user ? (params.username === user.username || params.username === 'me' || user.publicId === params.username) : false;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <ProfileHeader pharmacy={profile} isOwnProfile={isOwnProfile} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <ProfileInfoCard title="Hakkında">
            <p style={{ lineHeight: '1.6', color: '#444' }}>{profile.about || 'Henüz bir bilgi girilmemiş.'}</p>
        </ProfileInfoCard>

        <ProfileInfoCard title="İletişim & Künye">
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                    <strong style={{ width: '120px', color: '#555' }}>GLN:</strong> 
                    <span>{profile.gln || '-'}</span>
                </li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                    <strong style={{ width: '120px', color: '#555' }}>Konum:</strong> 
                    <span>{profile.location || '-'}</span>
                </li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                    <strong style={{ width: '120px', color: '#555' }}>Telefon:</strong> 
                    <span>{profile.phone || '-'}</span>
                </li>
                <li style={{ marginBottom: '10px', display: 'flex', alignItems: 'center' }}>
                    <strong style={{ width: '120px', color: '#555' }}>Kayıt Tarihi:</strong> 
                    <span>{profile.registrationDate || '-'}</span>
                </li>
            </ul>
        </ProfileInfoCard>
      </div>
    </div>
  );
}