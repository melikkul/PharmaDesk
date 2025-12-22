/**
 * Client Metadata Collector
 * 
 * Collects browser, device, and environment information for debugging.
 * Helps identify device-specific issues and browser compatibility problems.
 */

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface ClientMetadata {
  // Browser Info
  userAgent: string;
  browserName: string;
  browserVersion: string;
  
  // Device Info
  platform: string;
  screenResolution: string;
  viewportSize: string;
  colorDepth: number;
  devicePixelRatio: number;
  touchSupport: boolean;
  
  // Environment
  language: string;
  languages: string[];
  timezone: string;
  timezoneOffset: number;
  
  // Network
  online: boolean;
  connectionType?: string;
  effectiveType?: string;
  
  // Features
  cookiesEnabled: boolean;
  localStorageEnabled: boolean;
  sessionStorageEnabled: boolean;
  webGLSupport: boolean;
  
  // Page Info
  url: string;
  referrer: string;
  
  // Performance (optional)
  memoryInfo?: {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════

/**
 * Parse browser name and version from user agent
 */
function parseBrowserInfo(userAgent: string): { name: string; version: string } {
  const browsers = [
    { name: 'Chrome', regex: /Chrome\/(\d+\.\d+)/ },
    { name: 'Firefox', regex: /Firefox\/(\d+\.\d+)/ },
    { name: 'Safari', regex: /Version\/(\d+\.\d+).*Safari/ },
    { name: 'Edge', regex: /Edg\/(\d+\.\d+)/ },
    { name: 'Opera', regex: /OPR\/(\d+\.\d+)/ },
    { name: 'IE', regex: /MSIE (\d+\.\d+)/ },
  ];

  for (const browser of browsers) {
    const match = userAgent.match(browser.regex);
    if (match) {
      return { name: browser.name, version: match[1] };
    }
  }

  return { name: 'Unknown', version: 'Unknown' };
}

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if sessionStorage is available
 */
function isSessionStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check WebGL support
 */
function hasWebGLSupport(): boolean {
  if (typeof document === 'undefined') return false;
  
  try {
    const canvas = document.createElement('canvas');
    return !!(
      canvas.getContext('webgl') || 
      canvas.getContext('experimental-webgl')
    );
  } catch {
    return false;
  }
}

/**
 * Get network connection info
 */
function getConnectionInfo(): { connectionType?: string; effectiveType?: string } {
  // @ts-ignore - Network Information API is not in all TypeScript definitions
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (!connection) return {};
  
  return {
    connectionType: connection.type,
    effectiveType: connection.effectiveType,
  };
}

/**
 * Get memory info (Chrome only)
 */
function getMemoryInfo(): ClientMetadata['memoryInfo'] | undefined {
  // @ts-ignore - Memory API is Chrome-specific
  const memory = performance?.memory;
  
  if (!memory) return undefined;
  
  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
  };
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/**
 * Collect all client metadata
 */
export function getClientMetadata(): ClientMetadata {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      userAgent: 'Server-Side Rendering',
      browserName: 'SSR',
      browserVersion: 'N/A',
      platform: 'Server',
      screenResolution: 'N/A',
      viewportSize: 'N/A',
      colorDepth: 0,
      devicePixelRatio: 1,
      touchSupport: false,
      language: 'en',
      languages: ['en'],
      timezone: 'UTC',
      timezoneOffset: 0,
      online: true,
      cookiesEnabled: false,
      localStorageEnabled: false,
      sessionStorageEnabled: false,
      webGLSupport: false,
      url: '',
      referrer: '',
    };
  }

  const browserInfo = parseBrowserInfo(navigator.userAgent);
  const connectionInfo = getConnectionInfo();

  return {
    // Browser Info
    userAgent: navigator.userAgent,
    browserName: browserInfo.name,
    browserVersion: browserInfo.version,
    
    // Device Info
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    colorDepth: screen.colorDepth,
    devicePixelRatio: window.devicePixelRatio || 1,
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    
    // Environment
    language: navigator.language,
    languages: navigator.languages ? [...navigator.languages] : [navigator.language],
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    
    // Network
    online: navigator.onLine,
    ...connectionInfo,
    
    // Features
    cookiesEnabled: navigator.cookieEnabled,
    localStorageEnabled: isLocalStorageAvailable(),
    sessionStorageEnabled: isSessionStorageAvailable(),
    webGLSupport: hasWebGLSupport(),
    
    // Page Info
    url: window.location.href,
    referrer: document.referrer,
    
    // Performance
    memoryInfo: getMemoryInfo(),
  };
}

/**
 * Get a minimal subset of metadata for regular logging
 */
export function getMinimalMetadata(): Pick<
  ClientMetadata,
  'browserName' | 'browserVersion' | 'platform' | 'screenResolution' | 'online' | 'timezone'
> {
  if (typeof navigator === 'undefined') {
    return {
      browserName: 'SSR',
      browserVersion: 'N/A',
      platform: 'Server',
      screenResolution: 'N/A',
      online: true,
      timezone: 'UTC',
    };
  }

  const browserInfo = parseBrowserInfo(navigator.userAgent);

  return {
    browserName: browserInfo.name,
    browserVersion: browserInfo.version,
    platform: navigator.platform,
    screenResolution: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : 'N/A',
    online: navigator.onLine,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/**
 * Check if the current device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Get device type
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}
