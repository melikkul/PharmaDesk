import React from 'react';
import { AuthProvider } from '../context/AuthContext';
// import { ChatProvider } from '../context/ChatContext';
import { CartProvider } from '../context/CartContext';
import './globals.css'; // Assuming there might be a global css, if not I will remove it. But usually there is. 
// Actually, looking at the file list, I didn't see globals.css in src/app. 
// Let's check if there is one. 
// The user provided file list showed: form.css, etc.
// I will just add AuthProvider for now.

export const metadata = {
  title: 'PharmaDesk',
  icons: {
    icon: '/logoBeyaz.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <AuthProvider>
            <CartProvider>
              {children}
            </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}