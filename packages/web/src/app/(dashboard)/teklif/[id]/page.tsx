'use client';

import React, { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useOffer } from '@/hooks/useOffers';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import '@/app/(dashboard)/dashboard/dashboard.css';

// Reuse styles from ilacDetay or create new ones. 
// For now, I'll use inline styles or standard classes to ensure it works, 
// and try to reuse ilacDetay.module.css if possible, but importing it might be tricky if it's not in the same dir.
// I'll assume I can import it relative to the file.
// Actually, let's create a new CSS module for this page or use global styles.
// Given the user wants "Premium Design", I should try to make it look good.

export default function OfferDetailPage() {
    const params = useParams();
    const { id } = params as { id: string };
    const { offer, loading, error } = useOffer(id);
    const { addToCart } = useCart();

    const [quantity, setQuantity] = useState<number>(1);
    const [isAdding, setIsAdding] = useState(false);

    const handleIncrement = useCallback(() => {
        if (!offer) return;
        const maxStock = parseInt(offer.stock.split('+')[0]) || 0;
        setQuantity(prev => Math.min(maxStock, prev + 1));
    }, [offer]);

    const handleDecrement = useCallback(() => {
        setQuantity(prev => Math.max(1, prev - 1));
    }, []);

    const handleAddToCart = useCallback(() => {
        if (!offer || isAdding) return;
        
        // Map offer to CartItem format (ShowroomMedication)
        // This is a bit hacky because Cart expects ShowroomMedication structure
        // We need to adapt it.
        const stockParts = offer.stock.split('+').map(s => parseInt(s.trim()) || 0);
        const currentStock = stockParts[0];
        const bonus = stockParts[1] || 0;

        const medicationForCart = {
            id: offer.id,
            name: offer.productName,
            manufacturer: offer.manufacturer || 'Bilinmiyor',
            imageUrl: offer.imageUrl || '/placeholder-med.png',
            price: offer.price,
            expirationDate: offer.expirationDate || '',
            initialStock: currentStock + bonus,
            currentStock: currentStock,
            bonus: bonus,
            sellers: [{
                pharmacyId: offer.pharmacyId,
                pharmacyName: offer.pharmacyName,
                pharmacyUsername: offer.pharmacyUsername
            }]
        };

        setIsAdding(true);
        addToCart(medicationForCart, quantity, offer.pharmacyName);

        setTimeout(() => {
            setIsAdding(false);
        }, 1000);
    }, [offer, quantity, isAdding, addToCart]);

    if (loading) {
        return <div style={{ padding: '50px', textAlign: 'center' }}>Yükleniyor...</div>;
    }

    if (error || !offer) {
        return <div style={{ padding: '50px', textAlign: 'center', color: 'red' }}>{error || 'Teklif bulunamadı'}</div>;
    }

    const stockParts = offer.stock.split('+').map(s => parseInt(s.trim()) || 0);
    const currentStock = stockParts[0];
    const bonus = stockParts[1] || 0;
    const isOutOfStock = currentStock <= 0;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'minmax(300px, 400px) 1fr', 
                gap: '40px',
                backgroundColor: '#fff',
                borderRadius: '16px',
                padding: '30px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
            }}>
                {/* Image Section */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '12px',
                    height: '400px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <img 
                        src={offer.imageUrl || '/placeholder-med.png'} 
                        alt={offer.productName} 
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                    />
                    {isOutOfStock && (
                        <div style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            fontWeight: 'bold'
                        }}>
                            TÜKENDİ
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div>
                    <div style={{ marginBottom: '20px' }}>
                        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '10px', color: '#1a1a1a' }}>
                            {offer.productName}
                        </h1>
                        <p style={{ fontSize: '16px', color: '#666', marginBottom: '5px' }}>
                            Üretici: <span style={{ fontWeight: '500', color: '#333' }}>{offer.manufacturer || 'Belirtilmemiş'}</span>
                        </p>
                        <p style={{ fontSize: '14px', color: '#888' }}>
                            Barkod: {offer.id} {/* Using ID as placeholder if barcode not available */}
                        </p>
                    </div>

                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        marginBottom: '30px',
                        padding: '20px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '12px'
                    }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#0d6efd' }}>
                                {offer.price.toFixed(2)} ₺
                            </div>
                            <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                                Stok: <span style={{ fontWeight: '600', color: isOutOfStock ? '#dc3545' : '#198754' }}>
                                    {currentStock} {bonus > 0 && `+ ${bonus} Bonus`}
                                </span>
                            </div>
                            {offer.expirationDate && (
                                <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                                    SKT: {offer.expirationDate}
                                </div>
                            )}
                        </div>

                        {!isOutOfStock && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '200px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
                                    <button 
                                        onClick={handleDecrement}
                                        style={{ width: '40px', height: '40px', border: 'none', background: '#fff', cursor: 'pointer', fontSize: '18px' }}
                                    >-</button>
                                    <input 
                                        type="number" 
                                        value={quantity} 
                                        readOnly 
                                        style={{ flex: 1, height: '40px', border: 'none', textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }} 
                                    />
                                    <button 
                                        onClick={handleIncrement}
                                        style={{ width: '40px', height: '40px', border: 'none', background: '#fff', cursor: 'pointer', fontSize: '18px' }}
                                    >+</button>
                                </div>
                                <button 
                                    onClick={handleAddToCart}
                                    disabled={isAdding}
                                    style={{ 
                                        padding: '12px', 
                                        backgroundColor: isAdding ? '#198754' : '#0d6efd', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '8px', 
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {isAdding ? 'Eklendi!' : 'Sepete Ekle'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>Satıcı Bilgileri</h3>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            padding: '15px', 
                            border: '1px solid #eee', 
                            borderRadius: '10px' 
                        }}>
                            <div style={{ 
                                width: '50px', 
                                height: '50px', 
                                borderRadius: '50%', 
                                backgroundColor: '#e9ecef', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                color: '#666',
                                marginRight: '15px'
                            }}>
                                {offer.pharmacyName.charAt(0)}
                            </div>
                            <div>
                                <Link 
                                    href={`/profile/${offer.pharmacyId}`}
                                    style={{ fontSize: '16px', fontWeight: '600', color: '#0d6efd', textDecoration: 'none' }}
                                >
                                    {offer.pharmacyName}
                                </Link>
                                <div style={{ fontSize: '14px', color: '#666', marginTop: '2px' }}>
                                    Güvenilir Satıcı
                                </div>
                            </div>
                        </div>
                    </div>

                    {offer.description && (
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '15px' }}>Ürün Açıklaması</h3>
                            <p style={{ lineHeight: '1.6', color: '#444' }}>
                                {offer.description}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
