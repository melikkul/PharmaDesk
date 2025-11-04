import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './anasayfa.module.css';

// İkonlar için react-icons kütüphanesini kullanabilirsiniz (npm install react-icons)
// import { FaBoxes, FaSyncAlt, FaChartBar } from 'react-icons/fa';

export default function Anasayfa() {
    return (
        <div className={styles.pageContainer}>
            {/* 1. Navigasyon Çubuğu */}
            <nav className={styles.navbar}>
                <div className={styles.container}>
                    <Link href="/anasayfa" className={styles.navbarLogoLink}>
                        <Image 
                            src="/logoYesil.png" // public klasörünüzdeki logonuz
                            alt="PharmaDesk Logo" 
                            width={270} 
                            height={60} 
                            className={styles.navbarLogo}
                            style={{ objectFit: 'contain' }} // EKLENDİ: En-boy oranını korur
                        />
                    </Link>
                    <div className={styles.navLinks}>
                        <Link href="/login" className={styles.btnOutline}>Giriş Yap</Link>
                        <Link href="/register" className={styles.btnPrimary}>Kayıt Ol</Link>
                    </div>
                </div>
            </nav>

            {/* 2. Hero (Karşılama) Bölümü */}
            <header className={styles.heroSection}>
                <div className={styles.container}>
                    <div className={styles.heroContent}>
                        <h1 className={styles.heroTitle}>
                            PharmaDesk: Eczaneler Arası Modern Takas ve Stok Yönetimi
                        </h1>
                        <p className={styles.heroSubtitle}>
                            İhtiyaç fazlası ilaçlarınızı kolayca takas edin, miad riskini azaltın ve karlılığınızı artırın.
                        </p>
                        <Link href="/register" className={`${styles.btnPrimary} ${styles.btnLarge}`}>Hemen Ücretsiz Başlayın</Link>
                    </div>
                    <div className={styles.heroImagePlaceholder}>
                        {/* Buraya bir görsel veya video ekleyebilirsiniz */}
                        <p>Görsel Alanı</p>
                    </div>
                </div>
            </header>

            {/* 3. Özellikler Bölümü */}
            <section className={styles.featuresSection}>
                <div className={styles.container}>
                    <h2 className={styles.sectionTitle}>Neden PharmaDesk?</h2>
                    <div className={styles.featuresGrid}>
                        <div className={styles.featureBox}>
                            {/* <FaSyncAlt size={40} className={styles.featureIcon} /> */}
                            <div className={styles.featureIcon}>🔄</div>
                            <h3 className={styles.featureTitle}>Akıllı Takas Sistemi</h3>
                            <p>Elinizdeki ürünleri, ihtiyacınız olan ürünlerle anında takas edin.</p>
                        </div>
                        <div className={styles.featureBox}>
                            {/* <FaBoxes size={40} className={styles.featureIcon} /> */}
                            <div className={styles.featureIcon}>📦</div>
                            <h3 className={styles.featureTitle}>Stok/Miad Yönetimi</h3>
                            <p>Miadı yaklaşan ürünler için otomatik uyarılar alın ve kayıpları önleyin.</p>
                        </div>
                        <div className={styles.featureBox}>
                            {/* <FaChartBar size={40} className={styles.featureIcon} /> */}
                            <div className={styles.featureIcon}>📈</div>
                            <h3 className={styles.featureTitle}>Detaylı Raporlama</h3>
                            <p>Tüm takas ve stok hareketlerinizi analiz ederek verimli kararlar alın.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. CTA (Aksiyona Çağrı) Bölümü */}
            <section className={styles.ctaSection}>
                <div className={styles.container}>
                    <h2 className={styles.ctaTitle}>Binlerce Eczacının Arasına Katılın</h2>
                    <p className={styles.ctaText}>
                        PharmaDesk ile eczanenizi geleceğe taşıyın, stok maliyetlerinizi düşürün.
                    </p>
                    <Link href="/register" className={`${styles.btnWhite} ${styles.btnLarge}`}>Şimdi Kayıt Olun</Link>
                </div>
            </section>

            {/* 5. Footer Bölümü */}
            <footer className={styles.footer}>
                <div className={styles.container}>
                    <p>&copy; {new Date().getFullYear()} PharmaDesk. Tüm Hakları Saklıdır.</p>
                    <div className={styles.footerLinks}>
                        <Link href="/hakkimizda">Hakkımızda</Link>
                        <Link href="/kvkk">KVKK</Link>
                        <Link href="/iletisim">İletişim</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}