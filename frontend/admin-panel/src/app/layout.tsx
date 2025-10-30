import './globals.css';
import { AuthProvider } from '@/context/AuthContext'; // src/context'ten import eder

export const metadata = {
  title: 'PharmaDesk Admin Paneli',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        {/* AuthProvider tüm uygulamayı sarmalamalı */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}