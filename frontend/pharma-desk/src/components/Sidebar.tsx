// components/Sidebar.tsx

import React from 'react';
import styles from './Sidebar.module.css'; 

const Sidebar = () => (
  <aside className={styles.sidebar}>
    {/* DEĞİŞİKLİK: Dosya yolu mutlak hale getirildi. */}
    <a href="/dashboard"><img src="/logoBeyaz.png" alt="PharmaDesk Logo" className={styles.sidebarLogo} /></a>
    <nav className={styles.sidebarNav}>
      <ul>
        <li><a href="/ilaclar">İLAÇLAR</a></li>
        <li><a href="/tekliflerim">TEKLİFLERİM</a></li>
        <li><a href="/raporlar">RAPORLAR</a></li>
        <li><a href="/islem-gecmisi">İŞLEM GEÇMİŞİ</a></li>
        <li><a href="#">TRANSFERLERİM</a></li>
        <li><a href="#">GRUBUM</a></li>
      </ul>
    </nav>
  </aside>
);

export default Sidebar;