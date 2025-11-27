'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '../../lib/query-client';
import { ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * QueryProvider Component
 * 
 * Wraps the application with TanStack Query's QueryClientProvider.
 * Must be a Client Component because it uses React Context.
 * 
 * Features:
 * - Provides QueryClient to all child components
 * - Includes React Query DevTools in development mode
 * - Supports SSR with singleton pattern
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // Get the singleton QueryClient instance
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false} 
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}
