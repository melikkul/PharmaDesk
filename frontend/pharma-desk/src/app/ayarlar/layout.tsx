// app/ayarlar/layout.tsx
import React from 'react';

// Bu layout, Dashboard'ın genel yapısını (Sidebar, Header vb.) devralır
// ve ayar sayfalarını bu yapının içine yerleştirir.
// page.tsx'in içeriği 'children' olarak buraya gelir.
export default function AyarlarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}