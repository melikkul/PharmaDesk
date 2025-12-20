'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorPageContent() {
    const searchParams = useSearchParams();
    const message = searchParams.get('message') || 'Bir hata oluştu.';
    
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: '#f8fafc'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '40px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                textAlign: 'center',
                maxWidth: '500px',
                width: '100%'
            }}>
                <div style={{
                    fontSize: '64px',
                    marginBottom: '20px'
                }}>
                    ⚠️
                </div>
                <h1 style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1e293b',
                    marginBottom: '16px'
                }}>
                    Hata
                </h1>
                <p style={{
                    fontSize: '16px',
                    color: '#64748b',
                    marginBottom: '32px',
                    lineHeight: '1.6'
                }}>
                    {decodeURIComponent(message)}
                </p>
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    <Link 
                        href="/ilaclar"
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '14px'
                        }}
                    >
                        📦 İlaç Vitrini
                    </Link>
                    <Link 
                        href="/dashboard"
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#6366f1',
                            color: 'white',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '14px'
                        }}
                    >
                        🏠 Ana Sayfa
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ErrorPage() {
    return (
        <Suspense fallback={
            <div style={{ 
                minHeight: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
            }}>
                Yükleniyor...
            </div>
        }>
            <ErrorPageContent />
        </Suspense>
    );
}
