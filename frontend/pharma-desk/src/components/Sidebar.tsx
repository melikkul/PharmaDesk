// components/Sidebar.tsx

import React from 'react';

// Bileşenin kendi CSS'i varsa buraya import edilebilir, 
// ancak şimdilik global CSS kullanıyor.
// import './Sidebar.css'; 

const Sidebar = () => (
  <aside className="sidebar">
    <a href="./dashboard"><img src="logoBeyaz.png" alt="PharmaDesk Logo" className='sidebar-logo' /></a>
    <nav className="sidebar-nav">
      <ul>
        <li><a href="#">İLAÇLAR</a></li>
        <li><a href="#">TEKLİFLERİM</a></li>
        <li><a href="#">RAPORLAR</a></li>
        <li><a href="#">İŞLEM GEÇMİŞİ</a></li>
        <li><a href="#">TRANSFERLERİM</a></li>
        <li><a href="#">GRUBUM</a></li>
      </ul>
    </nav>
  </aside>
);

export default Sidebar;