'use client';

/**
 * Client-side Log Collector Service
 * 
 * Intercepts console.log, console.warn, console.error, etc.
 * and batches them to send to the backend for full-stack traceability.
 */

interface LogEntry {
  timestamp: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  stack?: string;
}

interface LogPayload {
  traceId: string | null;
  sessionId: string;
  logs: LogEntry[];
  metadata?: {
    userAgent: string;
    url: string;
    referrer: string;
    screenSize: string;
  };
}

class ClientLogCollector {
  private static instance: ClientLogCollector;
  private logs: LogEntry[] = [];
  private sessionId: string;
  private traceId: string | null = null;
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly maxLogs = 50;
  private readonly flushIntervalMs = 10000; // 10 seconds
  private isInitialized = false;
  private originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): ClientLogCollector {
    if (!ClientLogCollector.instance) {
      ClientLogCollector.instance = new ClientLogCollector();
    }
    return ClientLogCollector.instance;
  }

  /**
   * Initialize the collector - intercepts console methods
   */
  initialize() {
    if (this.isInitialized || typeof window === 'undefined') return;

    // Generate trace ID from header or create new
    this.traceId = this.getTraceId();

    // Intercept console methods
    this.interceptConsole();

    // Capture global errors
    this.captureGlobalErrors();

    // Start flush interval
    this.flushInterval = setInterval(() => this.flush(), this.flushIntervalMs);

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush(true));
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush(true);
        }
      });
    }

    this.isInitialized = true;
    this.log('info', '[LogCollector] Initialized with sessionId: ' + this.sessionId);
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private getTraceId(): string | null {
    // Try to get from cookie or generate
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/traceId=([^;]+)/);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Intercept console methods
   */
  private interceptConsole() {
    const levels: Array<'log' | 'info' | 'warn' | 'error' | 'debug'> = 
      ['log', 'info', 'warn', 'error', 'debug'];

    levels.forEach(level => {
      console[level] = (...args: unknown[]) => {
        // Call original console method
        this.originalConsole[level].apply(console, args);

        // Capture log
        this.captureLog(level, args);
      };
    });
  }

  /**
   * Capture a log entry
   */
  private captureLog(level: LogEntry['level'], args: unknown[]) {
    const message = args
      .map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');

    // Filter out internal log collector messages
    if (message.includes('[LogCollector]')) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: message.substring(0, 2000), // Limit message length
    };

    // Capture stack for errors
    if (level === 'error') {
      const error = args.find(arg => arg instanceof Error) as Error | undefined;
      if (error?.stack) {
        entry.stack = error.stack.substring(0, 1000);
      }
    }

    this.logs.push(entry);

    // Auto-flush if max logs reached
    if (this.logs.length >= this.maxLogs) {
      this.flush();
    }
  }

  /**
   * Capture global errors and unhandled rejections
   */
  private captureGlobalErrors() {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.captureLog('error', [
        `Uncaught Error: ${event.message}`,
        `at ${event.filename}:${event.lineno}:${event.colno}`,
      ]);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.captureLog('error', [
        'Unhandled Promise Rejection:',
        event.reason instanceof Error ? event.reason.message : String(event.reason),
      ]);
    });
  }

  /**
   * Manual log method
   */
  log(level: LogEntry['level'], message: string) {
    this.originalConsole[level](message);
    this.captureLog(level, [message]);
  }

  /**
   * Flush logs to backend
   */
  async flush(useBeacon = false) {
    if (this.logs.length === 0) return;

    const logsToSend = [...this.logs];
    this.logs = [];

    const payload: LogPayload = {
      traceId: this.traceId,
      sessionId: this.sessionId,
      logs: logsToSend.map(log => ({
        timestamp: log.timestamp,
        level: log.level,
        message: log.message,
        ...(log.stack && { stack: log.stack }),
      })),
      metadata: typeof window !== 'undefined' ? {
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
      } : undefined,
    };

    try {
      // Always use relative URL to go through Next.js proxy
      // This avoids issues with NEXT_PUBLIC_API_URL containing incorrect IPs
      const clientLogsUrl = '/api/admin/audit/client-logs';
      const jsonString = JSON.stringify(payload);

      if (useBeacon && navigator.sendBeacon) {
        // Use sendBeacon for page unload - wrap in Blob for correct Content-Type
        const blob = new Blob([jsonString], { type: 'application/json' });
        navigator.sendBeacon(clientLogsUrl, blob);
      } else {
        // Regular fetch for normal flush
        await fetch(clientLogsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: jsonString,
          keepalive: true,
        });
      }
    } catch {
      // Put logs back if failed
      this.logs = [...logsToSend, ...this.logs];
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    // Restore original console
    Object.assign(console, this.originalConsole);
    this.isInitialized = false;
  }
}

// Singleton export
export const clientLogger = ClientLogCollector.getInstance();

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  // Delay initialization to not interfere with page load
  setTimeout(() => {
    clientLogger.initialize();
  }, 1000);
}

export default clientLogger;
