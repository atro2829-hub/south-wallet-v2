'use client';

/**
 * Performance and Error Monitoring System for محفظة الجنوب
 * 
 * Features:
 * - Component render time tracking via React Profiler
 * - Error tracking and reporting
 * - Performance metrics: FCP, LCP, CLS (using PerformanceObserver)
 * - API call timing
 * - Stores metrics to Firebase at monitoring/{date}/
 */

import { database } from '@/lib/firebase';
import { ref, push, set } from 'firebase/database';

// ─── Types ───

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  path?: string;
}

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userId?: string;
  timestamp: number;
  userAgent: string;
  type: 'runtime' | 'render' | 'api' | 'network';
}

interface APICallMetric {
  url: string;
  method: string;
  duration: number;
  status: number;
  success: boolean;
  timestamp: number;
}

interface RenderMetric {
  componentName: string;
  duration: number;
  phase: 'mount' | 'update' | 'nested-update';
  timestamp: number;
}

// ─── Metric Thresholds ───

const THRESHOLDS = {
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  CLS: { good: 0.1, poor: 0.25 },
  API_CALL: { good: 1000, poor: 3000 },
  RENDER: { good: 16, poor: 50 },
};

function getRating(value: number, threshold: { good: number; poor: number }): 'good' | 'needs-improvement' | 'poor' {
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

// ─── In-Memory Buffer ───

let metricsBuffer: PerformanceMetric[] = [];
let errorsBuffer: ErrorReport[] = [];
let apiCallsBuffer: APICallMetric[] = [];
let renderBuffer: RenderMetric[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

// ─── Firebase Reporting ───

function getDateKey(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

async function flushToFirebase(): Promise<void> {
  if (
    metricsBuffer.length === 0 &&
    errorsBuffer.length === 0 &&
    apiCallsBuffer.length === 0 &&
    renderBuffer.length === 0
  ) {
    return;
  }

  try {
    const dateKey = getDateKey();
    const monitoringRef = ref(database, `monitoring/${dateKey}`);

    // Flush performance metrics
    if (metricsBuffer.length > 0) {
      const metricsRef = push(ref(database, `monitoring/${dateKey}/metrics`));
      await set(metricsRef, {
        data: metricsBuffer.slice(0, 50), // Limit batch size
        flushedAt: new Date().toISOString(),
      });
      metricsBuffer = [];
    }

    // Flush errors
    if (errorsBuffer.length > 0) {
      const errorsRef = push(ref(database, `monitoring/${dateKey}/errors`));
      await set(errorsRef, {
        data: errorsBuffer.slice(0, 20),
        flushedAt: new Date().toISOString(),
      });
      errorsBuffer = [];
    }

    // Flush API call metrics
    if (apiCallsBuffer.length > 0) {
      const apiRef = push(ref(database, `monitoring/${dateKey}/api`));
      await set(apiRef, {
        data: apiCallsBuffer.slice(0, 50),
        flushedAt: new Date().toISOString(),
      });
      apiCallsBuffer = [];
    }

    // Flush render metrics
    if (renderBuffer.length > 0) {
      const renderRef = push(ref(database, `monitoring/${dateKey}/renders`));
      await set(renderRef, {
        data: renderBuffer.slice(0, 100),
        flushedAt: new Date().toISOString(),
      });
      renderBuffer = [];
    }
  } catch (error) {
    console.warn('[Monitoring] Failed to flush to Firebase:', error);
  }
}

// ─── Initialization ───

let initialized = false;

export function initMonitoring(): () => void {
  if (initialized || typeof window === 'undefined') return () => {};
  initialized = true;

  // Set up periodic flush (every 30 seconds)
  flushTimer = setInterval(flushToFirebase, 30000);

  // Flush on page unload
  const handleUnload = () => {
    flushToFirebase();
  };
  window.addEventListener('beforeunload', handleUnload);

  // Set up Performance Observers
  setupPerformanceObservers();

  // Set up global error handler
  setupErrorTracking();

  console.log('[Monitoring] Initialized');

  return () => {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    window.removeEventListener('beforeunload', handleUnload);
    initialized = false;
  };
}

// ─── Performance Observers (FCP, LCP, CLS) ───

function setupPerformanceObservers(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  // First Contentful Paint
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          const value = entry.startTime;
          recordMetric('FCP', value, THRESHOLDS.FCP);
        }
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch {
    // Observer not supported
  }

  // Largest Contentful Paint
  try {
    let lcpValue = 0;
    const lcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        lcpValue = entry.startTime;
      }
      recordMetric('LCP', lcpValue, THRESHOLDS.LCP);
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // Observer not supported
  }

  // Cumulative Layout Shift
  try {
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      recordMetric('CLS', clsValue, THRESHOLDS.CLS);
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // Observer not supported
  }
}

function recordMetric(
  name: string,
  value: number,
  threshold: { good: number; poor: number }
): void {
  const metric: PerformanceMetric = {
    name,
    value,
    rating: getRating(value, threshold),
    timestamp: Date.now(),
    path: typeof window !== 'undefined' ? window.location.pathname : undefined,
  };
  metricsBuffer.push(metric);

  // Log poor metrics
  if (metric.rating === 'poor') {
    console.warn(`[Monitoring] Poor ${name}: ${value}ms`);
  }
}

// ─── Error Tracking ───

function setupErrorTracking(): void {
  if (typeof window === 'undefined') return;

  const handleError = (event: ErrorEvent) => {
    reportError({
      message: event.message,
      stack: event.error?.stack,
      url: event.filename || window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      type: 'runtime',
    });
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    reportError({
      message: `Unhandled Promise Rejection: ${event.reason}`,
      stack: event.reason?.stack,
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      type: 'runtime',
    });
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
}

export function reportError(error: Partial<ErrorReport> & { message: string }): void {
  const report: ErrorReport = {
    message: error.message,
    stack: error.stack,
    componentStack: error.componentStack,
    url: error.url || (typeof window !== 'undefined' ? window.location.href : ''),
    userId: error.userId,
    timestamp: error.timestamp || Date.now(),
    userAgent: error.userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
    type: error.type || 'runtime',
  };

  errorsBuffer.push(report);

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Monitoring] Error reported:', report.message);
  }

  // Flush errors immediately if critical
  if (errorsBuffer.length >= 10) {
    flushToFirebase();
  }
}

// ─── API Call Timing ───

export function trackAPICall(
  url: string,
  method: string,
  startTime: number,
  status: number
): void {
  const duration = Date.now() - startTime;
  const metric: APICallMetric = {
    url,
    method,
    duration,
    status,
    success: status >= 200 && status < 400,
    timestamp: Date.now(),
  };

  apiCallsBuffer.push(metric);

  // Log slow API calls
  if (duration > THRESHOLDS.API_CALL.poor) {
    console.warn(`[Monitoring] Slow API call: ${method} ${url} took ${duration}ms`);
  }
}

/**
 * Wrapper for fetch that tracks API call timing
 */
export function monitoredFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const startTime = Date.now();
  const method = options.method || 'GET';

  return fetch(url, options).then(
    (response) => {
      trackAPICall(url, method, startTime, response.status);
      return response;
    },
    (error) => {
      trackAPICall(url, method, startTime, 0);
      throw error;
    }
  );
}

// ─── React Profiler Callback ───

export function onRenderCallback(
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
): void {
  const metric: RenderMetric = {
    componentName: id,
    duration: actualDuration,
    phase,
    timestamp: Date.now(),
  };

  renderBuffer.push(metric);

  // Log slow renders
  if (actualDuration > THRESHOLDS.RENDER.poor) {
    console.warn(
      `[Monitoring] Slow render: ${id} (${phase}) took ${actualDuration.toFixed(2)}ms`
    );
  }
}

// ─── Get Current Metrics (for debugging) ───

export function getMonitoringStats() {
  return {
    metricsCount: metricsBuffer.length,
    errorsCount: errorsBuffer.length,
    apiCallsCount: apiCallsBuffer.length,
    renderCount: renderBuffer.length,
    initialized,
  };
}
