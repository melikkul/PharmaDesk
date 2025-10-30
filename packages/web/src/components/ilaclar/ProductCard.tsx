// src/components/ilaclar/ProductCard.tsx
// ### OPTİMİZASYON: 'React.memo' için 'React' import edildi ###
import React from 'react';
import Link from 'next/link'; // Yönlendirme için Link import ediyoruz
import type { ShowroomMedication } from '../../data/dashboardData';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  medication: ShowroomMedication;
}

const ProductCard: React.FC<ProductCardProps> = ({ medication }) => {
  const isOutOfStock = medication.currentStock === 0;
  const barWidth = medication.initialStock > 0 ? (medication.currentStock / medication.initialStock) * 100 : 0;

  // Create a URL-friendly slug from the medication name
  // Bu hesaplama basit olduğu için useMemo'ya gerek duyulmamıştır.
  const medicationSlug = medication.name.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`${styles.cardWrapper} ${isOutOfStock ? styles.outOfStock : ''}`}>
      <Link href={`/ilaclar/${medicationSlug}`} className={styles.productLink}>
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
              <Link key={seller.pharmacyUsername} href={`/profil/${seller.pharmacyUsername}`} className={styles.pharmacyLink}>
                {seller.pharmacyName}
              </Link>
            ))
          ) : (
            <span className={styles.noSeller}>Satan eczane bulunmuyor</span>
          )}
        </div>

        <div className={styles.offerBar}>
          <div className={styles.offerFill} style={{ width: `${barWidth}%` }}></div>
          <span className={styles.offerText}>{`${medication.currentStock} + ${medication.bonus}`}</span>
        </div>

        <div className={styles.price}>{medication.price.toFixed(2).replace('.', ',')}₺</div>
        
        <Link href={`/ilaclar/${medicationSlug}`} className={styles.productLink}>
            <button className={styles.addToCartBtn} disabled={isOutOfStock}>
            {isOutOfStock ? 'Stokta Yok' : 'İncele'}
            </button>
        </Link>
      </div>
    </div>
  );
};

// ### OPTİMİZASYON: React.memo ###
// Bu bileşen bir liste içinde map ile render edildiği için,
// 'medication' prop'u değişmediği sürece yeniden render olmasını engellemek
// listenin genel performansı için kritiktir.
export default React.memo(ProductCard);