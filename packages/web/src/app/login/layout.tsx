// packages/web/src/app/login/layout.tsx

import React from 'react';
import Image from 'next/image';
import logoImage from '../../../public/logoYesil.png';
import '../register/auth-layout.css'; // Hata veren CSS import yolunu düzelttik

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-container">
      <div className="auth-logo-container">
        <a href="/anasayfa">
          <Image src={logoImage} alt="PharmaDesk Logo" width={343} height={134} priority />
        </a>
      </div>
      <main className="auth-main-content">{children}</main>
    </div>
  );
}