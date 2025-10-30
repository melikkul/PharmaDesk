// src/app/layout.tsx
'use client'; // Context provider kullanmak için bu gerekli

import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "../context/CartContext"; // Import et

/* Metadata objesi 'use client' dosyasında doğrudan export edilemez.
   Eğer metadata gerekiyorsa, 'use client' olmayan ayrı bir
   layout.tsx veya page.tsx dosyasında tanımlanmalıdır.
   Bu basitlik için metadata'yı yorum satırına alıyorum.
*/
// export const metadata: Metadata = {
//   title: "Pharma Desk",
//   description: "Türkiyenin en iyi ilaç takas sistemi",
// };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <CartProvider> {/* Uygulamayı burada sarmala */}
          {children}
        </CartProvider>
      </body>
    </html>
  );
}