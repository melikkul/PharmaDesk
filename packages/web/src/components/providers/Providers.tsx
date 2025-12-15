'use client';

import React, { ReactNode } from 'react';
import { AuthProvider } from '../../store/AuthContext';
import { CartProvider } from '../../store/CartContext';
import { SignalRProvider } from '../../store/SignalRContext';
import { QueryProvider } from './QueryProvider';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side Providers wrapper
 * Wraps all context providers in a single client component
 * This is necessary for Next.js App Router to properly handle
 * client-side state during static page generation
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <SignalRProvider>
          <CartProvider>
            {children}
          </CartProvider>
        </SignalRProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
