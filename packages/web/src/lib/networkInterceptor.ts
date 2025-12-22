/**
 * Network Interceptor - Fetch/Axios Request Monitoring
 * 
 * Intercepts all network requests to add correlation headers and track performance.
 * Logs request timing, status codes, and errors for debugging.
 */

import { getTraceId, logDebugEvent } from './debugRecorder';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface NetworkLogEntry {
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status?: number;
  statusText?: string;
  error?: string;
  responseSize?: number;
}

// ═══════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════

let originalFetch: typeof fetch | null = null;
let isInterceptorActive = false;

// ═══════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Check if URL should be skipped (internal logging endpoints)
 */
function shouldSkipUrl(url: string): boolean {
  const skipPatterns = [
    '/api/admin/audit/client-logs',
    '/api/health',
    '/_next/',
    '/favicon.ico',
  ];
  return skipPatterns.some(pattern => url.includes(pattern));
}

/**
 * Extract response size from headers
 */
function getResponseSize(response: Response): number | undefined {
  const contentLength = response.headers.get('content-length');
  return contentLength ? parseInt(contentLength, 10) : undefined;
}

/**
 * Log network request to debug recorder
 */
function logNetworkRequest(entry: NetworkLogEntry): void {
  const level = entry.status && entry.status >= 400 ? 'error' : 'info';
  const message = entry.error
    ? `[Network Error] ${entry.method} ${entry.url} - ${entry.error}`
    : `[Network] ${entry.method} ${entry.url} - ${entry.status} (${entry.durationMs}ms)`;

  logDebugEvent(level, message, {
    type: 'network',
    ...entry,
  });
}

// ═══════════════════════════════════════════════════════════════
// Fetch Interceptor
// ═══════════════════════════════════════════════════════════════

/**
 * Create an intercepted fetch function
 */
function createInterceptedFetch(): typeof fetch {
  return async function interceptedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || 'GET';

    // Skip logging for internal endpoints
    if (shouldSkipUrl(url)) {
      return originalFetch!(input, init);
    }

    const startTime = performance.now();
    const traceId = getTraceId();

    // Add correlation ID header
    const headers = new Headers(init?.headers);
    if (traceId && !headers.has('X-Correlation-ID')) {
      headers.set('X-Correlation-ID', traceId);
    }

    const entry: NetworkLogEntry = {
      method: method.toUpperCase(),
      url,
      startTime: Date.now(),
    };

    try {
      const response = await originalFetch!(input, {
        ...init,
        headers,
      });

      entry.endTime = Date.now();
      entry.durationMs = Math.round(performance.now() - startTime);
      entry.status = response.status;
      entry.statusText = response.statusText;
      entry.responseSize = getResponseSize(response);

      logNetworkRequest(entry);

      return response;
    } catch (error) {
      entry.endTime = Date.now();
      entry.durationMs = Math.round(performance.now() - startTime);
      entry.error = error instanceof Error ? error.message : String(error);

      logNetworkRequest(entry);

      throw error;
    }
  };
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize the network interceptor
 */
export function initNetworkInterceptor(): void {
  if (isInterceptorActive || typeof window === 'undefined') {
    return;
  }

  originalFetch = window.fetch.bind(window);
  window.fetch = createInterceptedFetch();

  isInterceptorActive = true;
  console.info('[NetworkInterceptor] Initialized');
}

/**
 * Stop the network interceptor and restore original fetch
 */
export function stopNetworkInterceptor(): void {
  if (!isInterceptorActive || !originalFetch) {
    return;
  }

  window.fetch = originalFetch;
  originalFetch = null;
  isInterceptorActive = false;
}

/**
 * Check if interceptor is active
 */
export function isNetworkInterceptorActive(): boolean {
  return isInterceptorActive;
}

/**
 * Add correlation ID header to any request options
 */
export function addCorrelationHeader(headers: HeadersInit = {}): HeadersInit {
  const traceId = getTraceId();
  if (!traceId) return headers;

  if (headers instanceof Headers) {
    headers.set('X-Correlation-ID', traceId);
    return headers;
  }

  if (Array.isArray(headers)) {
    return [...headers, ['X-Correlation-ID', traceId]];
  }

  return {
    ...headers,
    'X-Correlation-ID': traceId,
  };
}

// Auto-initialize in browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNetworkInterceptor);
  } else {
    initNetworkInterceptor();
  }
}
