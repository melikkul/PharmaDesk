import { QueryClient } from '@tanstack/react-query';

/**
 * Global QueryClient instance (Singleton Pattern)
 * 
 * Configuration:
 * - Stale Time: 1 minute (60,000ms) - Queries remain fresh for 1 minute
 * - Cache Time: 5 minutes - Unused data is garbage collected after 5 minutes
 * - Retry: 3 attempts with exponential backoff
 * - Refetch on Window Focus: Enabled for data freshness
 */

let browserQueryClient: QueryClient | undefined = undefined;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for 1 minute
        staleTime: 60 * 1000, // 1 minute
        
        // Unused data is garbage collected after 5 minutes
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        
        // Retry failed requests 3 times
        retry: 3,
        
        // Retry delay with exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Refetch on window focus for fresh data
        refetchOnWindowFocus: true,
        
        // Refetch on reconnect
        refetchOnReconnect: true,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
        
        // Error handling for mutations
        onError: (error) => {
          console.error('[Query Client] Mutation error:', error);
        },
      },
    },
  });
}

/**
 * Get or create the QueryClient instance
 * Uses singleton pattern to ensure only one instance exists
 */
export function getQueryClient() {
  // Server-side: always create a new QueryClient
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }

  // Browser-side: create QueryClient only once
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }

  return browserQueryClient;
}
