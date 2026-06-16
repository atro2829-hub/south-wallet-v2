'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  lastOnline: Date | null;
  retry: () => Promise<boolean>;
}

// Queue for pending actions when offline
interface PendingAction {
  id: string;
  type: string;
  data: any;
  createdAt: Date;
}

const PENDING_ACTIONS_KEY = 'janoub-pending-actions';
const MAX_PENDING_AGE = 24 * 60 * 60 * 1000; // 24 hours

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof window !== 'undefined' ? navigator.onLine : true
  );
  const [lastOnline, setLastOnline] = useState<Date | null>(
    typeof window !== 'undefined' && navigator.onLine ? new Date() : null
  );
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      setLastOnline(new Date());
      // Process pending actions when coming back online
      processPendingActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
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
          processPendingActions();
        }
      }
    };

    window.addEventListener('firebase-connection-change', handleFirebaseConnection);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('firebase-connection-change', handleFirebaseConnection);
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  // Retry connection check
  const retry = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

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
        processPendingActions();
      }
      return online;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, []);

  return { isOnline, lastOnline, retry };
}

// ─── Pending Actions Queue ───

export function addPendingAction(type: string, data: any): string {
  const id = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const action: PendingAction = {
    id,
    type,
    data,
    createdAt: new Date(),
  };

  const pending = getPendingActions();
  pending.push(action);
  savePendingActions(pending);

  return id;
}

export function getPendingActions(): PendingAction[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(PENDING_ACTIONS_KEY);
    if (!stored) return [];

    const actions: PendingAction[] = JSON.parse(stored);
    // Filter out actions older than 24 hours
    const now = Date.now();
    return actions.filter((a) => {
      const age = now - new Date(a.createdAt).getTime();
      return age < MAX_PENDING_AGE;
    });
  } catch {
    return [];
  }
}

export function removePendingAction(id: string): void {
  const pending = getPendingActions().filter((a) => a.id !== id);
  savePendingActions(pending);
}

export function clearPendingActions(): void {
  try {
    localStorage.removeItem(PENDING_ACTIONS_KEY);
  } catch {
    // Ignore
  }
}

function savePendingActions(actions: PendingAction[]): void {
  try {
    localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(actions));
  } catch {
    // Ignore storage errors
  }
}

async function processPendingActions(): Promise<void> {
  const pending = getPendingActions();
  if (pending.length === 0) return;

  // Dispatch event for the app to process pending actions
  window.dispatchEvent(
    new CustomEvent('process-pending-actions', {
      detail: { actions: pending },
    })
  );
}

// ─── Cached data helpers ───

const CACHED_BALANCE_KEY = 'janoub-cached-balance';

export function cacheBalance(balance: { YER: number; SAR: number; USD: number }): void {
  try {
    localStorage.setItem(CACHED_BALANCE_KEY, JSON.stringify({
      ...balance,
      cachedAt: new Date().toISOString(),
    }));
  } catch {
    // Ignore
  }
}

export function getCachedBalance(): { YER: number; SAR: number; USD: number; cachedAt: string } | null {
  try {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(CACHED_BALANCE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}
