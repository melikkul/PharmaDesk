/**
 * Debug Recorder - Frontend Black Box Recorder
 * 
 * Captures console logs, network requests, and errors for end-to-end debugging.
 * Implements smart buffering with sendBeacon fallback for reliable log delivery.
 * 
 * Features:
 * - Console hijacking (log, warn, error, info, debug)
 * - Buffer-based log collection with periodic flush
 * - sendBeacon with fetch fallback for reliable delivery
 * - Sensitive data masking (passwords, tokens, credit cards)
 */

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface LogEntry {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  timestamp: number;
  args?: unknown[];
}

interface DebugSession {
  sessionId: string;
  traceId: string;
  startTime: number;
}

// ═══════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
  FLUSH_INTERVAL_MS: 5000,      // Flush logs every 5 seconds
  MAX_BUFFER_SIZE: 100,         // Flush when buffer reaches 100 entries
  API_ENDPOINT: '/api/admin/audit/client-logs',
  MASKED_TEXT: '***MASKED***',
  MASKED_TOKEN: '***TOKEN***',
  SENSITIVE_PATTERNS: [
    /password/i,
    /passwd/i,
    /secret/i,
    /token/i,
    /apikey/i,
    /authorization/i,
    /bearer\s+[^\s]+/gi,
    /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, // JWT
    /\b(?:\d{4}[\s-]?){3}\d{4}\b/g, // Credit card
  ]
};

// ═══════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════

let logBuffer: LogEntry[] = [];
let session: DebugSession | null = null;
let flushTimer: NodeJS.Timeout | null = null;
let isInitialized = false;

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

// ═══════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a unique session ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Mask sensitive data in a string
 */
function maskSensitiveData(input: string): string {
  let result = input;
  
  CONFIG.SENSITIVE_PATTERNS.forEach(pattern => {
    result = result.replace(pattern, CONFIG.MASKED_TEXT);
  });
  
  return result;
}

/**
 * Stringify arguments safely
 */
function stringifyArgs(args: unknown[]): string {
  try {
    const parts = args.map(arg => {
      if (typeof arg === 'string') {
        return maskSensitiveData(arg);
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          const json = JSON.stringify(arg, (key, value) => {
            // Mask sensitive object keys
            if (CONFIG.SENSITIVE_PATTERNS.some(p => p.test(key))) {
              return CONFIG.MASKED_TEXT;
            }
            if (typeof value === 'string') {
              return maskSensitiveData(value);
            }
            return value;
          });
          return json;
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    });
    return parts.join(' ');
  } catch {
    return '[Unable to stringify]';
  }
}

/**
 * Get client metadata
 */
function getClientMetadata(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  
  return {
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    browserLanguage: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorDepth: screen.colorDepth,
    cookiesEnabled: navigator.cookieEnabled,
    online: navigator.onLine,
    platform: navigator.platform,
    url: window.location.href,
  };
}

// ═══════════════════════════════════════════════════════════════
// Core Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Flush logs to backend with sendBeacon fallback to fetch
 */
async function flushLogs(): Promise<void> {
  if (logBuffer.length === 0 || !session) {
    return;
  }

  const logsToSend = [...logBuffer];
  logBuffer = []; // Clear buffer immediately

  const payload = JSON.stringify({
    traceId: session.traceId,
    sessionId: session.sessionId,
    logs: logsToSend.map(entry => ({
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp,
    })),
    metadata: getClientMetadata(),
  });

  // Try sendBeacon first (non-blocking, works during page unload)
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const success = navigator.sendBeacon(CONFIG.API_ENDPOINT, new Blob([payload], { type: 'application/json' }));
    
    if (success) {
      return;
    }
  }

  // Fallback to fetch with keepalive (for sendBeacon failure or large payloads)
  try {
    await fetch(CONFIG.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': session.traceId,
      },
      body: payload,
      keepalive: true, // Ensures request completes even during page unload
    });
  } catch (error) {
    // Restore logs to buffer if send failed
    logBuffer.unshift(...logsToSend);
    originalConsole.warn('[DebugRecorder] Failed to send logs:', error);
  }
}

/**
 * Add a log entry to the buffer
 */
function addLog(level: LogEntry['level'], args: unknown[]): void {
  if (!session) return;

  const entry: LogEntry = {
    level,
    message: stringifyArgs(args),
    timestamp: Date.now(),
  };

  logBuffer.push(entry);

  // Flush if buffer is full
  if (logBuffer.length >= CONFIG.MAX_BUFFER_SIZE) {
    flushLogs();
  }
}

/**
 * Override console methods
 */
function overrideConsole(): void {
  console.log = (...args: unknown[]) => {
    addLog('log', args);
    originalConsole.log(...args);
  };

  console.warn = (...args: unknown[]) => {
    addLog('warn', args);
    originalConsole.warn(...args);
  };

  console.error = (...args: unknown[]) => {
    addLog('error', args);
    originalConsole.error(...args);
    // Immediately flush on errors
    flushLogs();
  };

  console.info = (...args: unknown[]) => {
    addLog('info', args);
    originalConsole.info(...args);
  };

  console.debug = (...args: unknown[]) => {
    addLog('debug', args);
    originalConsole.debug(...args);
  };
}

/**
 * Capture unhandled errors
 */
function captureGlobalErrors(): void {
  if (typeof window === 'undefined') return;

  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    addLog('error', [
      `[Uncaught Error] ${event.message}`,
      `at ${event.filename}:${event.lineno}:${event.colno}`,
    ]);
    flushLogs(); // Immediately flush
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    addLog('error', [
      '[Unhandled Promise Rejection]',
      event.reason?.message || event.reason || 'Unknown reason',
    ]);
    flushLogs(); // Immediately flush
  });
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize the debug recorder
 */
export function initDebugRecorder(): DebugSession {
  if (isInitialized && session) {
    return session;
  }

  session = {
    sessionId: generateId(),
    traceId: generateId(),
    startTime: Date.now(),
  };

  overrideConsole();
  captureGlobalErrors();

  // Start periodic flush
  flushTimer = setInterval(flushLogs, CONFIG.FLUSH_INTERVAL_MS);

  // Flush on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flushLogs);
    window.addEventListener('pagehide', flushLogs);
  }

  isInitialized = true;
  originalConsole.info('[DebugRecorder] Initialized with sessionId:', session.sessionId);

  return session;
}

/**
 * Get current session info
 */
export function getDebugSession(): DebugSession | null {
  return session;
}

/**
 * Get current trace ID for correlation
 */
export function getTraceId(): string | null {
  return session?.traceId ?? null;
}

/**
 * Manually flush logs
 */
export function flushDebugLogs(): Promise<void> {
  return flushLogs();
}

/**
 * Stop the debug recorder
 */
export function stopDebugRecorder(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  // Restore original console
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;

  // Final flush
  flushLogs();

  session = null;
  isInitialized = false;
}

/**
 * Add a custom log entry
 */
export function logDebugEvent(
  level: 'log' | 'warn' | 'error' | 'info',
  message: string,
  metadata?: Record<string, unknown>
): void {
  addLog(level, [message, metadata].filter(Boolean));
}

// Auto-initialize in browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDebugRecorder);
  } else {
    initDebugRecorder();
  }
}
