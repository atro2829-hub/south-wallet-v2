'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import type {
  DbDepositRequest,
  DbWithdrawRequest,
  DbOrder,
  DbUser,
} from '@/lib/supabase';
import { useAdminStore } from '@/lib/store';

// ─────────────────────────────────────────────────────────
//  Debounce utility for realtime event handlers
// ─────────────────────────────────────────────────────────

/**
 * Creates a debounced version of a callback that delays invocation
 * until `wait` ms have elapsed since the last call. Prevents
 * excessive re-renders when Supabase fires many rapid changes.
 */
function debounce<T extends (...args: unknown[]) => void>(fn: T, wait: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = ((...args: unknown[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, wait);
  }) as T;
  return debounced;
}

/** Generate a unique channel-name suffix to prevent name collisions
 *  when React StrictMode remounts the component before the old
 *  channel has been cleaned up. */
function uniqueSuffix(): string {
  return `-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Safely remove a Supabase channel, swallowing errors. */
function safeRemoveChannel(ch: ReturnType<typeof supabase.channel>) {
  try {
    ch.unsubscribe();
  } catch {
    // ignore — channel may already be unsubscribed
  }
  try {
    supabase.removeChannel(ch);
  } catch {
    // ignore – channel may already be removed
  }
}

/**
 * useSupabaseSync
 *
 * Subscribes to Supabase Realtime for all admin-relevant tables and
 * populates the admin Zustand store with live data.
 *
 * Tables watched:
 *   - deposit_requests  (status = 'pending')
 *   - withdraw_requests (status = 'pending' | 'processing')
 *   - orders            (status = 'pending' | 'processing')
 *   - users             (kyc_status changes + full list for allUsers)
 *
 * The hook performs an initial fetch for every table and then listens
 * to postgres_changes events so the store stays in sync in real-time.
 * All subscriptions are cleaned up when the owning component unmounts.
 *
 * IMPORTANT: .on() is ALWAYS called BEFORE .subscribe() to avoid
 * the "cannot add callbacks after subscribe" Supabase error.
 */
export function useSupabaseSync() {
  const {
    isAuthenticated,
    setDepositRequests,
    setWithdrawRequests,
    setKycPendingUsers,
    setOrders,
    setAllUsers,
    setDataLoaded,
  } = useAdminStore();

  // Keep a ref to the channel so we can clean up
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Guard against double-initialisation in React StrictMode
  const initialisedRef = useRef(false);

  // ── Refs for stable callback references (avoids dependency-array churn) ──
  const setDepositRequestsRef = useRef(setDepositRequests);
  const setWithdrawRequestsRef = useRef(setWithdrawRequests);
  const setKycPendingUsersRef = useRef(setKycPendingUsers);
  const setOrdersRef = useRef(setOrders);
  const setAllUsersRef = useRef(setAllUsers);
  const setDataLoadedRef = useRef(setDataLoaded);

  // Keep refs in sync (no dependency — runs every render, very cheap)
  useEffect(() => {
    setDepositRequestsRef.current = setDepositRequests;
    setWithdrawRequestsRef.current = setWithdrawRequests;
    setKycPendingUsersRef.current = setKycPendingUsers;
    setOrdersRef.current = setOrders;
    setAllUsersRef.current = setAllUsers;
    setDataLoadedRef.current = setDataLoaded;
  });

  // ------------------------------------------------------------------
  // Fetch helpers
  // ------------------------------------------------------------------

  const fetchDepositRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDepositRequestsRef.current((data ?? []) as DbDepositRequest[]);
    } catch (err) {
      console.error('[SupabaseSync] fetchDepositRequests error:', err);
    }
  }, []);

  const fetchWithdrawRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('withdraw_requests')
        .select('*')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWithdrawRequestsRef.current((data ?? []) as DbWithdrawRequest[]);
    } catch (err) {
      console.error('[SupabaseSync] fetchWithdrawRequests error:', err);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrdersRef.current((data ?? []) as DbOrder[]);
    } catch (err) {
      console.error('[SupabaseSync] fetchOrders error:', err);
    }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const users = (data ?? []) as DbUser[];
      setAllUsersRef.current(users);

      // KYC pending = submitted (also include verified/rejected so admin can review history)
      const kycUsers = users.filter(
        (u) =>
          u.kyc_status === 'submitted' ||
          u.kyc_status === 'verified' ||
          u.kyc_status === 'rejected'
      );
      setKycPendingUsersRef.current(kycUsers);
    } catch (err) {
      console.error('[SupabaseSync] fetchAllUsers error:', err);
    }
  }, []);

  // ------------------------------------------------------------------
  // Initial data fetch
  // ------------------------------------------------------------------

  const fetchAllData = useCallback(async () => {
    await Promise.all([
      fetchDepositRequests(),
      fetchWithdrawRequests(),
      fetchOrders(),
      fetchAllUsers(),
    ]);
    setDataLoadedRef.current(true);
  }, [fetchDepositRequests, fetchWithdrawRequests, fetchOrders, fetchAllUsers]);

  // ------------------------------------------------------------------
  // Effect: subscribe when authenticated, unsubscribe when not
  //
  // CRITICAL: .on() must be called BEFORE .subscribe().
  // The channel gets a unique suffix to prevent the
  // "cannot add callbacks after subscribe" error that
  // occurs when supabase.channel() returns an existing
  // already-subscribed channel with the same name.
  // ------------------------------------------------------------------

  useEffect(() => {
    if (!isAuthenticated) {
      // Not authenticated – tear down any existing channel
      if (channelRef.current) {
        safeRemoveChannel(channelRef.current);
        channelRef.current = null;
      }
      initialisedRef.current = false;
      return;
    }

    // Prevent double-init in StrictMode
    if (initialisedRef.current) return;
    initialisedRef.current = true;

    // 1. Initial fetch
    fetchAllData();

    // 2. Generate unique suffix to avoid channel name collisions
    const suf = uniqueSuffix();

    // 3. Realtime subscriptions via a single channel
    //    Chain ALL .on() calls BEFORE the single .subscribe()
    const channel = supabase.channel(`admin-realtime-sync${suf}`);

    // Debounced refetch helpers for rapid changes
    const debouncedFetchDepositRequests = debounce(() => {
      void fetchDepositRequests();
    }, 300);
    const debouncedFetchWithdrawRequests = debounce(() => {
      void fetchWithdrawRequests();
    }, 300);
    const debouncedFetchOrders = debounce(() => {
      void fetchOrders();
    }, 300);
    const debouncedFetchAllUsers = debounce(() => {
      void fetchAllUsers();
    }, 300);

    // --- deposit_requests ---
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'deposit_requests' },
      (payload) => {
        const record = payload.new as DbDepositRequest | null;
        const oldRecord = payload.old as DbDepositRequest | null;

        if (payload.eventType === 'INSERT') {
          // Only add if pending
          if (record && record.status === 'pending') {
            const current = useAdminStore.getState().depositRequests as DbDepositRequest[];
            setDepositRequestsRef.current([record, ...current]);
          }
        } else if (payload.eventType === 'UPDATE') {
          const current = useAdminStore.getState().depositRequests as DbDepositRequest[];
          if (record) {
            if (record.status === 'pending') {
              // Update existing or add
              const idx = current.findIndex((r) => r.id === record.id);
              if (idx >= 0) {
                const updated = [...current];
                updated[idx] = record;
                setDepositRequestsRef.current(updated);
              } else {
                setDepositRequestsRef.current([record, ...current]);
              }
            } else {
              // No longer pending – remove
              setDepositRequestsRef.current(current.filter((r) => r.id !== record.id));
            }
          }
        } else if (payload.eventType === 'DELETE') {
          const current = useAdminStore.getState().depositRequests as DbDepositRequest[];
          const deletedId = oldRecord?.id || (record?.id as string);
          if (deletedId) {
            setDepositRequestsRef.current(current.filter((r) => r.id !== deletedId));
          }
        }
      }
    );

    // --- withdraw_requests ---
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'withdraw_requests' },
      (payload) => {
        const record = payload.new as DbWithdrawRequest | null;
        const oldRecord = payload.old as DbWithdrawRequest | null;

        const isActive = (r: DbWithdrawRequest | null) =>
          r && (r.status === 'pending' || r.status === 'processing');

        if (payload.eventType === 'INSERT') {
          if (isActive(record)) {
            const current = useAdminStore.getState().withdrawRequests as DbWithdrawRequest[];
            setWithdrawRequestsRef.current([record!, ...current]);
          }
        } else if (payload.eventType === 'UPDATE') {
          const current = useAdminStore.getState().withdrawRequests as DbWithdrawRequest[];
          if (record) {
            if (isActive(record)) {
              const idx = current.findIndex((r) => r.id === record.id);
              if (idx >= 0) {
                const updated = [...current];
                updated[idx] = record;
                setWithdrawRequestsRef.current(updated);
              } else {
                setWithdrawRequestsRef.current([record, ...current]);
              }
            } else {
              setWithdrawRequestsRef.current(current.filter((r) => r.id !== record.id));
            }
          }
        } else if (payload.eventType === 'DELETE') {
          const current = useAdminStore.getState().withdrawRequests as DbWithdrawRequest[];
          const deletedId = oldRecord?.id || (record?.id as string);
          if (deletedId) {
            setWithdrawRequestsRef.current(current.filter((r) => r.id !== deletedId));
          }
        }
      }
    );

    // --- orders ---
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      (payload) => {
        const record = payload.new as DbOrder | null;
        const oldRecord = payload.old as DbOrder | null;

        const isActive = (r: DbOrder | null) =>
          r && (r.status === 'pending' || r.status === 'processing');

        if (payload.eventType === 'INSERT') {
          if (isActive(record)) {
            const current = useAdminStore.getState().orders as DbOrder[];
            setOrdersRef.current([record!, ...current]);
          }
        } else if (payload.eventType === 'UPDATE') {
          const current = useAdminStore.getState().orders as DbOrder[];
          if (record) {
            if (isActive(record)) {
              const idx = current.findIndex((r) => r.id === record.id);
              if (idx >= 0) {
                const updated = [...current];
                updated[idx] = record;
                setOrdersRef.current(updated);
              } else {
                setOrdersRef.current([record, ...current]);
              }
            } else {
              setOrdersRef.current(current.filter((r) => r.id !== record.id));
            }
          }
        } else if (payload.eventType === 'DELETE') {
          const current = useAdminStore.getState().orders as DbOrder[];
          const deletedId = oldRecord?.id || (record?.id as string);
          if (deletedId) {
            setOrdersRef.current(current.filter((r) => r.id !== deletedId));
          }
        }
      }
    );

    // --- users ---
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users' },
      (payload) => {
        const record = payload.new as DbUser | null;
        const oldRecord = payload.old as DbUser | null;

        if (payload.eventType === 'INSERT') {
          if (record) {
            const current = useAdminStore.getState().allUsers as DbUser[];
            setAllUsersRef.current([record, ...current]);

            // Update KYC list if relevant
            if (
              record.kyc_status === 'submitted' ||
              record.kyc_status === 'verified' ||
              record.kyc_status === 'rejected'
            ) {
              const kycCurrent = useAdminStore.getState().kycPendingUsers as DbUser[];
              setKycPendingUsersRef.current([record, ...kycCurrent]);
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          if (record) {
            // Update allUsers
            const currentUsers = useAdminStore.getState().allUsers as DbUser[];
            const idx = currentUsers.findIndex((u) => u.id === record.id);
            if (idx >= 0) {
              const updated = [...currentUsers];
              updated[idx] = record;
              setAllUsersRef.current(updated);
            } else {
              setAllUsersRef.current([record, ...currentUsers]);
            }

            // Update KYC list
            const kycCurrent = useAdminStore.getState().kycPendingUsers as DbUser[];
            const isKycRelevant =
              record.kyc_status === 'submitted' ||
              record.kyc_status === 'verified' ||
              record.kyc_status === 'rejected';

            if (isKycRelevant) {
              const kycIdx = kycCurrent.findIndex((u) => u.id === record.id);
              if (kycIdx >= 0) {
                const updated = [...kycCurrent];
                updated[kycIdx] = record;
                setKycPendingUsersRef.current(updated);
              } else {
                setKycPendingUsersRef.current([record, ...kycCurrent]);
              }
            } else {
              // User no longer in KYC pipeline – remove from KYC list
              setKycPendingUsersRef.current(kycCurrent.filter((u) => u.id !== record.id));
            }
          }
        } else if (payload.eventType === 'DELETE') {
          const currentUsers = useAdminStore.getState().allUsers as DbUser[];
          const deletedId = oldRecord?.id || (record?.id as string);
          if (deletedId) {
            setAllUsersRef.current(currentUsers.filter((u) => u.id !== deletedId));
            const kycCurrent = useAdminStore.getState().kycPendingUsers as DbUser[];
            setKycPendingUsersRef.current(kycCurrent.filter((u) => u.id !== deletedId));
          }
        }
      }
    );

    // Subscribe AFTER all .on() handlers are registered
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[SupabaseSync] Realtime channel subscribed');
      }
      if (status === 'CHANNEL_ERROR') {
        console.error('[SupabaseSync] Realtime channel error:', status);
        // Attempt to recover by refetching data
        debouncedFetchDepositRequests();
        debouncedFetchWithdrawRequests();
        debouncedFetchOrders();
        debouncedFetchAllUsers();
      }
      if (status === 'TIMED_OUT') {
        console.warn('[SupabaseSync] Realtime channel timed out');
      }
    });

    channelRef.current = channel;

    // Cleanup on unmount or when auth changes
    return () => {
      if (channelRef.current) {
        safeRemoveChannel(channelRef.current);
        channelRef.current = null;
      }
      initialisedRef.current = false;
    };
  }, [
    isAuthenticated,
    fetchAllData,
    fetchDepositRequests,
    fetchWithdrawRequests,
    fetchOrders,
    fetchAllUsers,
  ]);
}
