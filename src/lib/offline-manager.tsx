'use client';

/**
 * Offline Manager for محفظة الجنوب
 * 
 * Features:
 * - Queue pending transactions when offline
 * - Auto-execute queued transactions when back online
 * - Show offline banner at top of screen
 * - Cache frequently accessed data (balance, recent transactions, providers)
 * - Optimistic UI updates for offline actions
 * - Sync conflict resolution (server wins)
 */

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { WifiOff, CloudOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───

interface QueuedTransaction {
  id: string;
  type: 'transfer' | 'recharge' | 'bill' | 'order' | 'payment';
  data: Record<string, unknown>;
  createdAt: string;
  status: 'pending' | 'processing' | 'failed';
  retryCount: number;
  optimisticResult?: Record<string, unknown>;
}

interface CachedData {
  balance: { YER: number; SAR: number; USD: number } | null;
  recentTransactions: unknown[];
  providers: unknown[];
  lastUpdated: string;
}

// ─── Constants ───

const QUEUE_KEY = 'janoub-offline-queue';
const CACHE_KEY = 'janoub-offline-cache';
const MAX_QUEUE_SIZE = 50;
const MAX_RETRIES = 3;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ─── Queue Management ───

export function queueTransaction(type: QueuedTransaction['type'], data: Record<string, unknown>): QueuedTransaction {
  const transaction: QueuedTransaction = {
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    data,
    createdAt: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
  };

  const queue = getQueue();
  if (queue.length >= MAX_QUEUE_SIZE) {
    queue.shift();
  }
  queue.push(transaction);
  saveQueue(queue);

  return transaction;
}

export function getQueue(): QueuedTransaction[] {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(QUEUE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function removeFromQueue(id: string): void {
  const queue = getQueue().filter(t => t.id !== id);
  saveQueue(queue);
}

export function updateQueueItem(id: string, updates: Partial<QueuedTransaction>): void {
  const queue = getQueue();
  const index = queue.findIndex(t => t.id === id);
  if (index !== -1) {
    queue[index] = { ...queue[index], ...updates };
    saveQueue(queue);
  }
}

export function clearQueue(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    // Ignore
  }
}

function saveQueue(queue: QueuedTransaction[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore storage errors
  }
}

// ─── Auto-Execute on Reconnect ───

export async function processQueue(): Promise<{ processed: number; failed: number }> {
  const queue = getQueue();
  const pending = queue.filter(t => t.status === 'pending' && t.retryCount < MAX_RETRIES);

  let processed = 0;
  let failed = 0;

  for (const tx of pending) {
    updateQueueItem(tx.id, { status: 'processing' });

    try {
      const result = await executeTransaction(tx);
      if (result.success) {
        removeFromQueue(tx.id);
        processed++;
      } else {
        updateQueueItem(tx.id, {
          status: 'failed',
          retryCount: tx.retryCount + 1,
        });
        failed++;
      }
    } catch {
      updateQueueItem(tx.id, {
        status: 'pending',
        retryCount: tx.retryCount + 1,
      });
      failed++;
    }
  }

  return { processed, failed };
}

async function executeTransaction(tx: QueuedTransaction): Promise<{ success: boolean; data?: unknown }> {
  // All transactions now go directly through Supabase - no API routes needed
  try {
    const { supabase } = await import('@/lib/supabase');
    
    // Process based on transaction type using Supabase directly
    switch (tx.type) {
      case 'transfer': {
        const { data, error } = await supabase.from('transactions').insert(tx.data).select().single();
        if (error) return { success: false };
        return { success: true, data };
      }
      case 'recharge':
      case 'bill':
      case 'order':
      case 'payment': {
        const { data, error } = await supabase.from('transactions').insert(tx.data).select().single();
        if (error) return { success: false };
        return { success: true, data };
      }
      default: {
        const { data, error } = await supabase.from('transactions').insert(tx.data).select().single();
        if (error) return { success: false };
        return { success: true, data };
      }
    }
  } catch {
    return { success: false };
  }
}

// ─── Cache Management ───

export function cacheOfflineData(data: Partial<CachedData>): void {
  try {
    if (typeof window === 'undefined') return;
    const existing = getCachedData();
    const updated: CachedData = {
      ...existing,
      ...data,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
}

export function getCachedData(): CachedData {
  try {
    if (typeof window === 'undefined') return { balance: null, recentTransactions: [], providers: [], lastUpdated: '' };
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return { balance: null, recentTransactions: [], providers: [], lastUpdated: '' };

    const data: CachedData = JSON.parse(stored);
    return data;
  } catch {
    return { balance: null, recentTransactions: [], providers: [], lastUpdated: '' };
  }
}

export function isCacheStale(): boolean {
  const data = getCachedData();
  if (!data.lastUpdated) return true;
  const age = Date.now() - new Date(data.lastUpdated).getTime();
  return age > CACHE_TTL;
}

// ─── Optimistic UI Updates ───

export function applyOptimisticBalance(
  currentBalance: { YER: number; SAR: number; USD: number },
  amount: number,
  currency: 'YER' | 'SAR' | 'USD',
  direction: 'subtract' | 'add'
): { YER: number; SAR: number; USD: number } {
  const newBalance = { ...currentBalance };
  if (direction === 'subtract') {
    newBalance[currency] = Math.max(0, (newBalance[currency] || 0) - amount);
  } else {
    newBalance[currency] = (newBalance[currency] || 0) + amount;
  }
  return newBalance;
}

// ─── Sync Conflict Resolution (Server Wins) ───

export async function syncWithServer(localData: CachedData, serverData: Partial<CachedData>): CachedData {
  const synced: CachedData = {
    balance: serverData.balance || localData.balance,
    recentTransactions: serverData.recentTransactions || localData.recentTransactions,
    providers: serverData.providers || localData.providers,
    lastUpdated: new Date().toISOString(),
  };

  cacheOfflineData(synced);
  return synced;
}

// ─── Network Status using useSyncExternalStore ───

function subscribeOnlineStatus(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

function getServerOnlineSnapshot() {
  return true;
}

// ─── Network Status Hook ───

export function useOfflineStatus() {
  const isOnline = useSyncExternalStore(subscribeOnlineStatus, getOnlineSnapshot, getServerOnlineSnapshot);
  const [queueLength, setQueueLength] = useState(() =>
    typeof window !== 'undefined' ? getQueue().filter(t => t.status === 'pending').length : 0
  );

  // Process queue when coming back online
  useEffect(() => {
    if (isOnline) {
      processQueue().then(({ processed, failed }) => {
        if (processed > 0 || failed > 0) {
          console.log(`[Offline] Processed: ${processed}, Failed: ${failed}`);
        }
      });
    }
  }, [isOnline]);

  // Update queue length periodically
  useEffect(() => {
    const updateQueueLength = () => {
      setQueueLength(getQueue().filter(t => t.status === 'pending').length);
    };
    const interval = setInterval(updateQueueLength, 2000);
    return () => clearInterval(interval);
  }, []);

  return { isOnline, queueLength };
}

// ─── Offline Banner Component ───

// Custom external store for "back online" banner timing
let backOnlineTimestamp: number | null = null;
const backOnlineListeners = new Set<() => void>();

function subscribeBackOnline(callback: () => void) {
  backOnlineListeners.add(callback);
  return () => backOnlineListeners.delete(callback);
}

function getBackOnlineSnapshot() {
  if (backOnlineTimestamp === null) return false;
  return Date.now() < backOnlineTimestamp;
}

function getBackOnlineServerSnapshot() {
  return false;
}

// Listen for online events to set the back-online timestamp
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    backOnlineTimestamp = Date.now() + 3000;
    backOnlineListeners.forEach(l => l());
    // Clear after 3 seconds
    setTimeout(() => {
      backOnlineTimestamp = null;
      backOnlineListeners.forEach(l => l());
    }, 3100);
  });
  window.addEventListener('offline', () => {
    backOnlineTimestamp = null;
    backOnlineListeners.forEach(l => l());
  });
}

export function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribeOnlineStatus, getOnlineSnapshot, getServerOnlineSnapshot);
  const isBackOnline = useSyncExternalStore(subscribeBackOnline, getBackOnlineSnapshot, getBackOnlineServerSnapshot);
  const { queueLength } = useOfflineStatus();

  const showBanner = !isOnline || isBackOnline;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
          role="status"
          aria-live="polite"
        >
          <div
            className="flex items-center justify-center gap-2 px-4 py-2"
            style={{
              background: isOnline
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            }}
          >
            {isOnline ? (
              <>
                <CloudOff size={14} color="white" aria-hidden="true" />
                <span className="text-white text-xs font-medium">
                  تم استعادة الاتصال
                  {queueLength > 0 ? ` - جاري مزامنة ${queueLength} عمليات...` : ''}
                </span>
              </>
            ) : (
              <>
                <WifiOff size={14} color="white" aria-hidden="true" />
                <span className="text-white text-xs font-medium">
                  الوضع بدون إنترنت
                  {queueLength > 0 ? ` - ${queueLength} عمليات معلقة` : ''}
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
