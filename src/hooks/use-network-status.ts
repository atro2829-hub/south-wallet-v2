'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useNetworkStatus - Hook for detecting online/offline status
 * Uses navigator.onLine + online/offline events for real-time detection
 */

interface NetworkStatusInfo {
  isOnline: boolean;
  lastOnline: Date | null;
  wasOffline: boolean; // Was offline at some point during session
  offlineDuration: number | null; // Duration in ms of current offline period
  retry: () => Promise<boolean>;
  retryCount: number;
}

export function useNetworkStatus(): NetworkStatusInfo {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== 'undefined' ? navigator.onLine : true
  );
  const [lastOnline, setLastOnline] = useState<Date | null>(
    typeof window !== 'undefined' && navigator.onLine ? new Date() : null
  );
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState(0);
  const wentOfflineAt = useRef<Date | null>(null);

  // Compute offline duration derived from wentOfflineAt ref
  // We use a timer to update the displayed duration every second
  const [tick, setTick] = useState(0);
  const offlineDuration = isOnline
    ? null
    : wentOfflineAt.current
      ? (tick >= 0 ? Date.now() - wentOfflineAt.current.getTime() : null)
      : null;

  useEffect(() => {
    if (!isOnline) {
      const id = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(id);
    } else {
      setTick(0);
      wentOfflineAt.current = null;
    }
  }, [isOnline]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setLastOnline(new Date());
      wentOfflineAt.current = null;
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      wentOfflineAt.current = new Date();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also listen for Firebase connection state changes via custom event
    const handleFirebaseConnection = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.isConnected !== undefined) {
        setIsOnline(customEvent.detail.isConnected);
        if (customEvent.detail.isConnected) {
          setLastOnline(new Date());
          wentOfflineAt.current = null;
        } else {
          setWasOffline(true);
          wentOfflineAt.current = new Date();
        }
      }
    };

    window.addEventListener('firebase-connection-change', handleFirebaseConnection);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('firebase-connection-change', handleFirebaseConnection);
    };
  }, []);

  // Retry connection check
  const retry = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    setRetryCount((prev) => prev + 1);

    try {
      // Try fetching a lightweight resource to verify connectivity
      const response = await fetch('/manifest.json', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000),
      });

      const online = response.ok;
      setIsOnline(online);
      if (online) {
        setLastOnline(new Date());
        wentOfflineAt.current = null;
      }
      return online;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, []);

  return { isOnline, lastOnline, wasOffline, offlineDuration, retry, retryCount };
}

/**
 * Simple online/offline detection - just returns boolean
 * Useful for lightweight components that only need to know if online
 */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
