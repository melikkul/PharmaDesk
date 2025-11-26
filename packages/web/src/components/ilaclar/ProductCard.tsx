// src/components/ilaclar/ProductCard.tsx
import React from 'react';
import Link from 'next/link';
import { PharmacyLink, PriceDisplay } from '@/components/common';
import type { ShowroomMedication } from '../../lib/dashboardData';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  medication: ShowroomMedication;
}

const ProductCard: React.FC<ProductCardProps> = ({ medication }) => {
  const isOutOfStock = medication.currentStock === 0;
  const barWidth = medication.initialStock > 0 ? (medication.currentStock / medication.initialStock) * 100 : 0;

  const medicationSlug = medication.name.toLowerCase().replace(/[\s\/]+/g, '-');

  return (
    <div className={`${styles.cardWrapper} ${isOutOfStock ? styles.outOfStock : ''}`}>
      <Link href={`/ilaclar/${medication.id}`} className={styles.productLink}>
        <div className={styles.imageContainer}>
          {isOutOfStock && <div className={styles.outOfStockBanner}><span>TÜKENDİ</span></div>}
          <img src={medication.imageUrl || "/dolorex_placeholder.png"} alt={medication.name} className={styles.productImage} />
        </div>
      </Link>

      <div className={styles.cardContent}>
        <h3 className={styles.productName} title={medication.name}>{medication.name}</h3>
        
        <div className={styles.pharmacyList}>
          {medication.sellers.length > 0 ? (
            medication.sellers.map(seller => (
              <PharmacyLink 
                key={seller.pharmacyId} 
                id={seller.pharmacyId}
                className={styles.pharmacyLink}
              >
                {seller.pharmacyName}
              </PharmacyLink>
            ))
          ) : (
            <span className={styles.noSeller}>Satan eczane bulunmuyor</span>
          )}
        </div>

        <div className={styles.offerBar}>
          <div className={styles.offerFill} style={{ width: `${barWidth}%` }}></div>
          <span className={styles.offerText}>{`${medication.currentStock} + ${medication.bonus}`}</span>
        </div>

        <div className={styles.price}>
          <PriceDisplay amount={medication.price} />
        </div>
        
        <Link href={`/ilaclar/${medication.id}`} className={styles.productLink}>
            <button className={styles.addToCartBtn} disabled={isOutOfStock}>
            {isOutOfStock ? 'Stokta Yok' : 'İncele'}
            </button>
        </Link>
      </div>
    </div>
  );
};

export default React.memo(ProductCard);