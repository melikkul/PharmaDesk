// melikkul/pharmadesk/PharmaDesk-main/frontend/pharma-desk/src/components/ilaclar/WarehouseOffers.tsx

import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { WarehouseOffer } from '../../data/dashboardData';
// === DÜZELTME BURADA ===
// Hatalı yol: import styles from '../../app/ilaclar/[ilacAdi]/ilacDetay.module.css';
import styles from '@/app/(dashboard)/ilaclar/[ilacAdi]/ilacDetay.module.css'; // Yeni doğru yol
// =======================

// İkonlar (Basit SVG)
const ArrowLeft = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const ArrowRight = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;

// Tek bir depo teklif kartı bileşeni
interface WarehouseOfferItemProps {
    warehouseName: string;
    price: number;
    stockInfo: string;
}

const WarehouseOfferItem: React.FC<WarehouseOfferItemProps> = ({ warehouseName, price, stockInfo }) => {
    return (
        <div className={styles.warehouseItem}>
            <div className={styles.warehouseLogoPlaceholder}>ED</div>
            <strong>{warehouseName.split(' ')[0]}</strong>
            <span>{stockInfo}</span>
            <span className={styles.warehousePrice}>{price.toFixed(2).replace('.', ',')}₺</span>
        </div>
    );
};

// Ana Ecza Deposu Teklifleri Bileşeni
interface WarehouseOffersProps {
    data: WarehouseOffer[];
}

const WarehouseOffers: React.FC<WarehouseOffersProps> = ({ data }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    
    // ### OPTİMİZASYON: useCallback ###
    // Kaydırma durumunu kontrol eden fonksiyon.
    // scrollRef.current'a her zaman en son haliyle erişeceği için bağımlılığa gerek yok.
    const checkScrollState = useCallback(() => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            
            // Sola kaydırılabilir mi? (Başlangıçtan biraz ötede)
            setCanScrollLeft(scrollLeft > 10); 
            
            // Sağa kaydırılabilir mi? (Bitişe yakın değil)
            // 20px tolerans, kaydırma çubuğunun hassasiyetini dengelemek için
            setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
        }
    }, []); // Bağımlılık yok, çünkü sadece ref'in .current'ını okuyor.
    
    // ### OPTİMİZASYON: useCallback ###
    // Yana kaydırma fonksiyonu. `checkScrollState`'e bağımlı.
    const scroll = useCallback((direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const cardWidth = 260; // 240px kart genişliği + 20px gap
            const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
            
            scrollRef.current.scrollBy({
                left: scrollAmount,
                behavior: 'smooth',
            });
            
            // Kaydırma bittikten sonra durumu güncellemek için küçük bir gecikme
            // checkScrollState'in memoize edilmiş halini kullanır.
            setTimeout(checkScrollState, 350); 
        }
    }, [checkScrollState]); // checkScrollState'e bağımlı.

    // Bileşen yüklendiğinde ve pencere boyutu değiştiğinde kaydırma durumunu kontrol et
    useEffect(() => {
        // Bileşen mount edildiğinde hemen durumu kontrol et
        const timer = setTimeout(checkScrollState, 100); // DOM'un oturması için küçük bir gecikme
        window.addEventListener('resize', checkScrollState);
        
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', checkScrollState);
        };
    }, [data, checkScrollState]); // ### OPTİMİZASYON: checkScrollState bağımlılıklara eklendi.

    // ### OPTİMİZASYON: useCallback ###
    // Kaydırma olayını dinleyen fonksiyon.
    const handleScroll = useCallback(() => {
        checkScrollState();
    }, [checkScrollState]); // checkScrollState'e bağımlı.


    return (
        <div className={styles.warehouseOffersSection}>
            <h2>İlaç Depoları Fiyatları</h2>
            <div className={styles.warehouseOffersContainer}>
                
                {/* Sol Ok Butonu */}
                <button 
                    className={`${styles.scrollButton} ${styles.scrollButtonLeft}`}
                    onClick={() => scroll('left')}
                    disabled={!canScrollLeft}
                >
                    <ArrowLeft />
                </button>

                {/* Yatay Kaydırılabilir Liste */}
                <div 
                    className={styles.warehouseList} 
                    ref={scrollRef}
                    onScroll={handleScroll} // Memoize edilmiş fonksiyon kullanılıyor
                >
                    {data.map(offer => (
                        <WarehouseOfferItem 
                            key={offer.id} 
                            warehouseName={offer.warehouseName} 
                            price={offer.price} 
                            stockInfo={offer.stockInfo} 
                        />
                    ))}
                </div>

                {/* Sağ Ok Butonu */}
                 <button 
                    className={`${styles.scrollButton} ${styles.scrollButtonRight}`}
                    onClick={() => scroll('right')}
                    disabled={!canScrollRight}
                >
                    <ArrowRight />
                </button>
            </div>
        </div>
    );
};

export default WarehouseOffers;