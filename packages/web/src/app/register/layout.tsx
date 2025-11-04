// packages/web/src/app/(auth)/layout.tsx

import React from 'react';
import Image from 'next/image'; // Image component'i
import logoImage from '../../../public/logoYesil.png'; // Doğru logo dosyasını import ediyoruz
import './auth-layout.css'; // Bu layout'a özel CSS dosyası

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