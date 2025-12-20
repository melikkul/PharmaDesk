'use client';

import React from 'react';
import styles from './TrackingStatusCard.module.css';

interface TrackingStatus {
    shipmentId: number;
    carrierId: number | null;
    carrierName: string | null;
    carrierPhone: string | null;
    carrierLocation: {
        latitude: number;
        longitude: number;
        lastUpdate: string;
    } | null;
    currentStopCount: number;
    myStopOrder: number;
    remainingStops: number;
    estimatedArrival: string | null;
    shipmentStatus: string;
    isLiveTrackingAvailable: boolean;
}

interface TrackingStatusCardProps {
    status: TrackingStatus;
}

/**
 * TrackingStatusCard - Status card showing delivery progress
 * Layout: [Package Icon + Status] | [Queue Info + ETA] | [Carrier Info]
 */
export default function TrackingStatusCard({ status }: TrackingStatusCardProps) {
    const getStatusBadge = () => {
        switch (status.shipmentStatus) {
            case 'in_transit':
                return { text: 'Yolda', className: styles.badgeInTransit, icon: '🚚' };
            case 'delivered':
                return { text: 'Teslim Edildi', className: styles.badgeDelivered, icon: '✅' };
            case 'pending':
                return { text: 'Hazırlanıyor', className: styles.badgePending, icon: '📦' };
            default:
                return { text: status.shipmentStatus, className: styles.badgeDefault, icon: '📦' };
        }
    };

    const badge = getStatusBadge();
    const isApproaching = status.remainingStops <= 5 && status.remainingStops > 0;

    return (
        <div className={`${styles.card} ${isApproaching ? styles.approaching : ''}`}>
            {/* Left: Package Icon + Status Badge */}
            <div className={styles.section}>
                <div className={styles.iconWrapper}>
                    <span className={styles.icon}>{badge.icon}</span>
                </div>
                <span className={`${styles.badge} ${badge.className}`}>
                    {badge.text}
                </span>
            </div>

            {/* Middle: Queue Info + ETA */}
            <div className={`${styles.section} ${styles.middle}`}>
                {status.shipmentStatus === 'in_transit' ? (
                    <>
                        <div className={styles.queueInfo}>
                            {status.remainingStops > 0 ? (
                                <>
                                    <span className={styles.queueLabel}>Sırada</span>
                                    <span className={styles.queueNumber}>{status.remainingStops}</span>
                                    <span className={styles.queueLabel}>kişi var</span>
                                </>
                            ) : (
                                <span className={styles.nextUp}>🎉 Sıradaki siz!</span>
                            )}
                        </div>
                        {status.estimatedArrival && (
                            <div className={styles.eta}>
                                <span className={styles.etaIcon}>⏱️</span>
                                <span className={styles.etaTime}>~{status.estimatedArrival}</span>
                            </div>
                        )}
                    </>
                ) : status.shipmentStatus === 'delivered' ? (
                    <div className={styles.deliveredInfo}>
                        <span>Siparişiniz teslim edildi</span>
                    </div>
                ) : (
                    <div className={styles.pendingInfo}>
                        <span>Kurye atanması bekleniyor</span>
                    </div>
                )}
            </div>

            {/* Right: Carrier Info */}
            <div className={`${styles.section} ${styles.right}`}>
                {status.carrierName ? (
                    <>
                        <div className={styles.carrierAvatar}>
                            🚚
                        </div>
                        <div className={styles.carrierDetails}>
                            <span className={styles.carrierName}>{status.carrierName}</span>
                            {status.carrierPhone && (
                                <a href={`tel:${status.carrierPhone}`} className={styles.carrierPhone}>
                                    📱 {status.carrierPhone}
                                </a>
                            )}
                        </div>
                    </>
                ) : (
                    <div className={styles.noCarrier}>
                        <span>Kurye bilgisi yok</span>
                    </div>
                )}
            </div>
        </div>
    );
}
