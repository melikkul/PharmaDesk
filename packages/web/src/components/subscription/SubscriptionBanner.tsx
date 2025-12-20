"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './SubscriptionBanner.module.css';

interface SubscriptionBannerProps {
  subscriptionStatus?: string;
  subscriptionExpireDate?: string;
}

export default function SubscriptionBanner({ subscriptionStatus, subscriptionExpireDate }: SubscriptionBannerProps) {
  const [bannerState, setBannerState] = useState<{
    show: boolean;
    type: 'warning' | 'error' | 'info';
    message: string;
    daysRemaining?: number | null;
  } | null>(null);

  useEffect(() => {
    // No subscription info available
    if (!subscriptionStatus) {
      setBannerState(null);
      return;
    }

    const status = subscriptionStatus;
    const isActive = status === 'Active' || status === 'Trial';
    
    // Calculate days remaining
    let daysRemaining: number | null = null;
    if (subscriptionExpireDate) {
      const expireDate = new Date(subscriptionExpireDate);
      const now = new Date();
      const diff = expireDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    if (!isActive) {
      // Subscription is not active (Cancelled or PastDue)
      let message = 'Aboneliğiniz sona ermiştir. Platformu kullanmaya devam etmek için yenileyin.';
      
      if (status === 'Cancelled') {
        message = 'Aboneliğiniz iptal edilmiştir. Platformu kullanmaya devam etmek için yeniden abone olun.';
      } else if (status === 'PastDue') {
        message = 'Ödemeniz gecikmiştir. Erişiminizi korumak için lütfen ödemenizi yapın.';
      } else if (status === 'Trial') {
        message = 'Deneme süreniz dolmuştur. Platformu kullanmaya devam etmek için abonelik satın alın.';
      }
      
      setBannerState({
        show: true,
        type: 'error',
        message,
        daysRemaining: null
      });
    } else if (daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0) {
      // Subscription expiring soon
      setBannerState({
        show: true,
        type: 'warning',
        message: `Aboneliğinizin bitmesine ${daysRemaining} gün kaldı. Erişiminizi kaybetmemek için şimdi yenileyin.`,
        daysRemaining
      });
    } else {
      setBannerState(null);
    }
  }, [subscriptionStatus, subscriptionExpireDate]);

  if (!bannerState?.show) {
    return null;
  }

  return (
    <div className={`${styles.banner} ${styles[bannerState.type]}`}>
      <div className={styles.content}>
        <span className={styles.icon}>
          {bannerState.type === 'error' ? '🚫' : '⚠️'}
        </span>
        <span className={styles.message}>{bannerState.message}</span>
      </div>
      <Link href="/abonelik" className={styles.actionButton}>
        {bannerState.type === 'error' ? 'Abonelik Satın Al' : 'Şimdi Yenile'}
      </Link>
    </div>
  );
}
