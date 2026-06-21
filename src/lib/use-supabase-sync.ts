'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase, supabaseService } from '@/lib/supabase';
import type {
  DbUser,
  DbTransaction,
  DbNotification,
  DbSection,
  DbServiceProvider,
  DbProductPackage,
  DbExchangeRate,
  DbBanner,
  DbFeatureFlag,
  DbKillSwitch,
  DbMaintenance,
} from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import type { ServiceProvider, ProductPackage, ServiceCategory } from '@/lib/store';
import { buildFbSectionsFromStatic } from '@/lib/static-sections';

// ─────────────────────────────────────────────────────────
//  Type Mappers: Supabase DB → Zustand Store
// ─────────────────────────────────────────────────────────

/** Map a Supabase DbUser row to the store's User shape.
 *  NOTE: store.user.id is the Firebase Auth UID, NOT the Supabase UUID. */
function mapDbUserToStore(dbUser: DbUser, firebaseUid: string) {
  // The new schema uses display_name (not first_name/second_name/etc.)
  // and role is an ENUM ('user', 'admin', 'support')
  // kyc_status is an ENUM ('none', 'pending', 'verified', 'rejected')
  return {
    id: firebaseUid, // store keeps Firebase UID as id
    email: dbUser.email || '',
    phone: dbUser.phone || '',
    name: dbUser.display_name || dbUser.phone || '',
    firstName: dbUser.display_name || '',
    secondName: '',
    thirdName: '',
    familyName: '',
    nationalId: '',
    avatar: dbUser.avatar_url || '',
    role: (dbUser.role === 'admin' || dbUser.role === 'support' ? 'admin' : 'user') as 'user' | 'admin' | 'owner',
    userId: dbUser.id, // Supabase UUID stored here for reference
    displayId: dbUser.display_id || '', // 6-digit user-facing account number
    kycStatus: (dbUser.kyc_status === 'none' ? 'pending' : dbUser.kyc_status) as 'pending' | 'submitted' | 'verified' | 'rejected',
    isBlocked: dbUser.is_blocked || false,
    balanceYER: Number(dbUser.balance_yer) || 0,
    balanceSAR: Number(dbUser.balance_sar) || 0,
    balanceUSD: Number(dbUser.balance_usd) || 0,
    cardType: '',
    cardNumber: '',
    cardIssuedAt: '',
    governorate: '',
    theme: 'light' as 'light' | 'dark',
  };
}

/** Map a Supabase DbTransaction row to the store's Transaction shape. */
function mapDbTransactionToStore(dbTx: any) {
  return {
    id: dbTx.id,
    fromUserId: dbTx.from_user_id || '',
    toUserId: dbTx.to_user_id || '',
    amount: Number(dbTx.amount) || 0,
    currency: dbTx.currency || 'YER',
    type: dbTx.type || 'order',
    status: dbTx.status === 'reversed' ? 'refunded' : (dbTx.status || 'completed'),
    description: dbTx.description || '',
    createdAt: dbTx.created_at || new Date().toISOString(),
  };
}

/** Map a Supabase DbNotification row to the store's Notification shape. */
function mapDbNotificationToStore(dbNotif: any) {
  // New schema: entity_type, entity_id, action_url, metadata
  // Old schema: navigation_target, navigation_params, data
  const meta = dbNotif.metadata || {};
  return {
    id: dbNotif.id,
    title: dbNotif.title || '',
    body: dbNotif.body || '',
    type: (dbNotif.type || 'system') as 'info' | 'transaction' | 'security' | 'promo',
    isRead: dbNotif.is_read || false,
    createdAt: dbNotif.created_at || new Date().toISOString(),
    navigationTarget: dbNotif.action_url || meta.navigation_target || undefined,
    navigationParams: meta.navigation_params || undefined,
    data: meta || undefined,
  };
}

/** Map a Supabase DbServiceProvider row to the store's ServiceProvider shape. */
function mapDbProviderToStore(dbProv: DbServiceProvider): ServiceProvider {
  return {
    id: dbProv.id,
    categoryId: dbProv.section_id || '',
    name: dbProv.name || '',
    color: dbProv.color || '',
    icon: dbProv.icon || '',
    isActive: dbProv.is_active ?? true,
    inputLabel: dbProv.input_label || '',
    inputType: dbProv.input_type === 'tel' ? 'phone' : 'text',
    inputPrefix: dbProv.input_prefix || undefined,
    subSectionId: dbProv.sub_section_id || undefined,
  };
}

/** Map a Supabase DbProductPackage row to the store's ProductPackage shape.
 *  Always displays prices in USD. If price_usd is not set, converts from
 *  YER or SAR using approximate exchange rates.
 */
function mapDbPackageToStore(dbPkg: DbProductPackage): ProductPackage {
  // USD-only pricing: prefer price_usd, convert from YER/SAR if needed
  // Exchange rates: 1 USD ≈ 1550 YER, 1 USD ≈ 3.75 SAR
  const YER_TO_USD = 1 / 1550;
  const SAR_TO_USD = 1 / 3.75;

  let priceUSD: number;
  if (dbPkg.price_usd && dbPkg.price_usd > 0) {
    priceUSD = dbPkg.price_usd;
  } else if (dbPkg.price_yer && dbPkg.price_yer > 0) {
    priceUSD = Math.ceil(dbPkg.price_yer * YER_TO_USD * 100) / 100; // round up to 2 decimals
  } else if (dbPkg.price_sar && dbPkg.price_sar > 0) {
    priceUSD = Math.ceil(dbPkg.price_sar * SAR_TO_USD * 100) / 100;
  } else {
    priceUSD = 0;
  }

  return {
    id: dbPkg.id,
    providerId: dbPkg.provider_id || '',
    name: dbPkg.name || '',
    price: priceUSD,
    currency: 'USD' as const, // Always USD
    executionType: dbPkg.execution_type === 'api' ? 'auto' : dbPkg.execution_type || 'manual',
    isActive: dbPkg.is_active ?? true,
    apiProvider: dbPkg.api_product_id || undefined,
    costPrice: dbPkg.cost_price || undefined,
    commission: dbPkg.commission_amount || undefined,
  };
}

/** Map a Supabase DbSection row to a store ServiceCategory shape. */
function mapDbSectionToCategory(dbSec: DbSection): ServiceCategory {
  return {
    id: dbSec.id,
    name: dbSec.name || '',
    type: (dbSec.type || 'telecom') as ServiceCategory['type'],
    icon: dbSec.icon || '',
  };
}

/** Map a Supabase DbExchangeRate row to the store's exchangeRates shape.
 *  Store expects: { YER: number, SAR: number, USD: number }
 *  Where SAR = how many YER per 1 SAR, USD = how many YER per 1 USD */
function mapDbExchangeRateToStore(dbRate: DbExchangeRate) {
  return {
    YER: 1, // base currency
    SAR: dbRate.sar_to_yer || 0,
    USD: dbRate.usd_to_yer || 0,
  };
}

/** Map a Supabase DbFeatureFlag array to the store's FeatureFlags shape. */
function mapDbFeatureFlagsToStore(dbFlags: DbFeatureFlag[]) {
  const flags: Record<string, boolean> = {};
  for (const f of dbFlags) {
    // Convert flag_key like "transfers_enabled" to "transfersEnabled"
    const camelKey = f.flag_key
      .replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
    flags[camelKey] = f.is_enabled;
  }
  return flags;
}

/** Map a Supabase DbKillSwitch row to the store's killSwitch shape. */
function mapDbKillSwitchToStore(dbKs: DbKillSwitch) {
  return {
    active: dbKs.is_active,
    message: dbKs.message || '',
    activatedAt: dbKs.activated_at || '',
    activatedBy: dbKs.activated_by || '',
    deactivateAt: dbKs.deactivate_at || '',
    duration: dbKs.duration_minutes || 0,
  };
}

/** Map a Supabase DbMaintenance row to the store's MaintenanceMode shape. */
function mapDbMaintenanceToStore(dbM: DbMaintenance) {
  return {
    active: dbM.is_active,
    message: dbM.message || '',
    estimatedTime: dbM.estimated_time || '',
    activatedAt: dbM.activated_at || undefined,
  };
}

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

// ─────────────────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────────────────

/**
 * Syncs data from Supabase (Realtime + REST) to the Zustand store.
 *
 * - On mount: fetches initial data via supabaseService
 * - Real-time: subscribes to postgres_changes for live updates
 * - On window focus / visibility change: refreshes user data
 * - Cleans up all subscriptions on unmount
 *
 * IMPORTANT: .on() is ALWAYS called BEFORE .subscribe() to avoid
 * the "cannot add callbacks after subscribe" Supabase error.
 */
export function useSupabaseSync() {
  const user = useAppStore((s) => s.user);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setUser = useAppStore((s) => s.setUser);
  const setTransactions = useAppStore((s) => s.setTransactions);
  const setNotifications = useAppStore((s) => s.setNotifications);
  const setProviders = useAppStore((s) => s.setProviders);
  const setPackages = useAppStore((s) => s.setPackages);
  const setCategories = useAppStore((s) => s.setCategories);
  const setExchangeRates = useAppStore((s) => s.setExchangeRates);
  const setFbSections = useAppStore((s) => s.setFbSections);
  const setKillSwitch = useAppStore((s) => s.setKillSwitch);
  const setFeatureFlags = useAppStore((s) => s.setFeatureFlags);
  const setMaintenance = useAppStore((s) => s.setMaintenance);

  // ── Refs for stable callback references (avoids dependency-array churn) ──
  const firebaseUidRef = useRef(user?.id);
  const supabaseUuidRef = useRef<string | null>(null);
  const isAuthenticatedRef = useRef(isAuthenticated);
  const isRefreshing = useRef(false);

  const setUserRef = useRef(setUser);
  const setTransactionsRef = useRef(setTransactions);
  const setNotificationsRef = useRef(setNotifications);
  const setProvidersRef = useRef(setProviders);
  const setPackagesRef = useRef(setPackages);
  const setCategoriesRef = useRef(setCategories);
  const setExchangeRatesRef = useRef(setExchangeRates);
  const setFbSectionsRef = useRef(setFbSections);
  const setKillSwitchRef = useRef(setKillSwitch);
  const setFeatureFlagsRef = useRef(setFeatureFlags);
  const setMaintenanceRef = useRef(setMaintenance);

  // Keep refs in sync (no dependency — runs every render, very cheap)
  useEffect(() => {
    firebaseUidRef.current = user?.id;
    isAuthenticatedRef.current = isAuthenticated;
    setUserRef.current = setUser;
    setTransactionsRef.current = setTransactions;
    setNotificationsRef.current = setNotifications;
    setProvidersRef.current = setProviders;
    setPackagesRef.current = setPackages;
    setCategoriesRef.current = setCategories;
    setExchangeRatesRef.current = setExchangeRates;
    setFbSectionsRef.current = setFbSections;
    setKillSwitchRef.current = setKillSwitch;
    setFeatureFlagsRef.current = setFeatureFlags;
    setMaintenanceRef.current = setMaintenance;
  });

  // Track active Supabase Realtime channels for cleanup
  const userChannelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const globalChannelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  // ─────────────────────────────────────────────────────────
  //  Refresh helpers
  // ─────────────────────────────────────────────────────────

  /** Resolve the Supabase UUID from the Firebase UID and cache it. */
  const resolveSupabaseUuid = useCallback(async (firebaseUid: string): Promise<string | null> => {
    try {
      const dbUser = await supabaseService.getUserByFirebaseUid(firebaseUid);
      if (dbUser) {
        supabaseUuidRef.current = dbUser.id;
        return dbUser.id;
      }
    } catch (error) {
      console.error('[SupabaseSync] Failed to resolve Supabase UUID:', error);
    }
    return null;
  }, []);

  /** Fetch fresh user data from Supabase and update store. */
  const refreshUser = useCallback(async () => {
    const firebaseUid = firebaseUidRef.current;
    const isAuth = isAuthenticatedRef.current;
    if (!firebaseUid || !isAuth) return;
    if (isRefreshing.current) return;

    isRefreshing.current = true;
    try {
      const dbUser = await supabaseService.getUserByFirebaseUid(firebaseUid);
      if (dbUser) {
        supabaseUuidRef.current = dbUser.id;
        const storeUser = useAppStore.getState().user;
        const mapped = mapDbUserToStore(dbUser, firebaseUid);

        // Only update if data actually changed (avoid unnecessary re-renders)
        if (storeUser) {
          const hasChanges =
            storeUser.balanceYER !== mapped.balanceYER ||
            storeUser.balanceSAR !== mapped.balanceSAR ||
            storeUser.balanceUSD !== mapped.balanceUSD ||
            storeUser.name !== mapped.name ||
            storeUser.firstName !== mapped.firstName ||
            storeUser.secondName !== mapped.secondName ||
            storeUser.thirdName !== mapped.thirdName ||
            storeUser.familyName !== mapped.familyName ||
            storeUser.nationalId !== mapped.nationalId ||
            storeUser.kycStatus !== mapped.kycStatus ||
            storeUser.isBlocked !== mapped.isBlocked ||
            storeUser.phone !== mapped.phone ||
            storeUser.avatar !== mapped.avatar ||
            storeUser.cardType !== mapped.cardType ||
            storeUser.cardNumber !== mapped.cardNumber ||
            storeUser.governorate !== mapped.governorate ||
            storeUser.role !== mapped.role ||
            storeUser.theme !== mapped.theme;

          if (hasChanges) {
            setUserRef.current(mapped);
          }
        } else {
          setUserRef.current(mapped);
        }
      }

      // Also refresh transactions
      await refreshTransactions();
    } catch (error) {
      console.error('[SupabaseSync] refreshUser error:', error);
    } finally {
      isRefreshing.current = false;
    }
  }, []);

  /** Fetch transactions for the current user from Supabase. */
  const refreshTransactions = useCallback(async () => {
    const firebaseUid = firebaseUidRef.current;
    const isAuth = isAuthenticatedRef.current;
    if (!firebaseUid || !isAuth) return;

    try {
      // Ensure we have the Supabase UUID
      let supabaseUuid = supabaseUuidRef.current;
      if (!supabaseUuid) {
        supabaseUuid = await resolveSupabaseUuid(firebaseUid);
        if (!supabaseUuid) return;
      }

      const dbTransactions = await supabaseService.getTransactions(supabaseUuid, 100);
      const transactions = dbTransactions.map(mapDbTransactionToStore);
      setTransactionsRef.current(transactions);
    } catch (error) {
      console.error('[SupabaseSync] refreshTransactions error:', error);
    }
  }, [resolveSupabaseUuid]);

  /** Fetch notifications for the current user from Supabase. */
  const refreshNotifications = useCallback(async () => {
    const firebaseUid = firebaseUidRef.current;
    const isAuth = isAuthenticatedRef.current;
    if (!firebaseUid || !isAuth) return;

    try {
      let supabaseUuid = supabaseUuidRef.current;
      if (!supabaseUuid) {
        supabaseUuid = await resolveSupabaseUuid(firebaseUid);
        if (!supabaseUuid) return;
      }

      const dbNotifs = await supabaseService.getNotifications(supabaseUuid);
      const notifications = dbNotifs.map(mapDbNotificationToStore);
      setNotificationsRef.current(notifications);
    } catch (error) {
      console.error('[SupabaseSync] refreshNotifications error:', error);
    }
  }, [resolveSupabaseUuid]);

  // ─────────────────────────────────────────────────────────
  //  Global data fetch (not user-specific)
  // ─────────────────────────────────────────────────────────

  // FAST BOOT: Try to load the build-time JSON snapshot first.
  // This lets the app render the structure (sections, providers, banners,
  // investment plans, etc.) instantly without waiting for a Supabase
  // round-trip. The full fetchGlobalData() still runs in the background
  // to reconcile with the latest DB state (and Realtime subscriptions
  // push admin changes immediately afterwards).
  const loadBootSnapshot = useCallback(async () => {
    try {
      // In Capacitor, the file is served from capacitor://localhost/data/sections.json
      // In dev, it's at /data/sections.json (relative to /public)
      // If the prebuild script didn't run, the file is missing — fail silently.
      const res = await fetch('/data/sections.json', { cache: 'force-cache' });
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    } catch {
      // Network error or file missing — fall back to live fetch
      return null;
    }
  }, []);

  // Apply the boot snapshot immediately (synchronously if possible) so the
  // first paint shows the structure. Then fetchGlobalData() reconciles.
  // NOTE: sections are NOT loaded from snapshot — they are STATIC in code.
  const applyBootSnapshot = useCallback((snapshot: any) => {
    if (!snapshot) return;
    try {
      // Sections: SKIP — home-screen uses STATIC_SECTIONS hardcoded in code
      // if (snapshot.sections ...) → REMOVED
      if (snapshot.service_providers && Array.isArray(snapshot.service_providers)) {
        const providers = snapshot.service_providers.map(mapDbProviderToStore);
        setProvidersRef.current(providers);
      }
      // banners, investment_plans, escrow_categories, usdt_categories are
      // fetched on demand by their respective screens, so we don't need to
      // pre-populate them here.
      console.log('[SupabaseSync] Boot snapshot applied:',
        snapshot._meta?.counts || 'no counts');
    } catch (e) {
      console.warn('[SupabaseSync] Boot snapshot apply failed:', e);
    }
  }, []);

  const fetchGlobalData = useCallback(async () => {
    // 1. Try boot snapshot (instant)
    const snapshot = await loadBootSnapshot();
    if (snapshot) applyBootSnapshot(snapshot);

    // 2. Then fetch live data (reconcile)
    try {
      // Fetch all global data in parallel for speed
      // ====================================================================
      // SECTIONS ARE NOW STATIC — hardcoded in home-screen.tsx (STATIC_SECTIONS).
      // We DO NOT fetch sections from DB anymore. The admin controls content
      // (providers, games, packages) via DB, but the section grid structure
      // is fixed at build time.
      // We still fetch: service_providers, exchange_rates, feature_flags,
      // kill_switch, maintenance.
      // ====================================================================
      const [
        providersResult,
        exchangeRatesResult,
        featureFlagsResult,
        killSwitchResult,
        maintenanceResult,
      ] = await Promise.allSettled([
        supabaseService.getServiceProviders(),
        supabaseService.getExchangeRates(),
        supabaseService.getFeatureFlags(),
        supabaseService.getKillSwitch(),
        supabaseService.getMaintenance(),
      ]);

      // Sections: populate store from STATIC_SECTIONS since the `sections` table
      // was dropped in migration 033. This ensures services-screen renders
      // all sections (games section will show its 200 DB providers).
      // categories stays empty (unused by current UI).
      setCategoriesRef.current([]);
      setFbSectionsRef.current(buildFbSectionsFromStatic());

      // Providers
      if (providersResult.status === 'fulfilled' && providersResult.value) {
        const providers = providersResult.value.map(mapDbProviderToStore);
        setProvidersRef.current(providers);

        // Fetch packages for all providers in parallel
        const packagePromises = providersResult.value.map((p: DbServiceProvider) =>
          supabaseService.getProductPackages(p.id).catch(() => [] as DbProductPackage[])
        );
        const packageResults = await Promise.allSettled(packagePromises);
        const allPackages: ProductPackage[] = [];
        for (const result of packageResults) {
          if (result.status === 'fulfilled' && result.value) {
            allPackages.push(...result.value.map(mapDbPackageToStore));
          }
        }
        setPackagesRef.current(allPackages);
      }

      // Exchange rates
      if (exchangeRatesResult.status === 'fulfilled' && exchangeRatesResult.value) {
        setExchangeRatesRef.current(mapDbExchangeRateToStore(exchangeRatesResult.value));
      }

      // Feature flags
      if (featureFlagsResult.status === 'fulfilled' && featureFlagsResult.value) {
        const flags = mapDbFeatureFlagsToStore(featureFlagsResult.value);
        setFeatureFlagsRef.current(flags);
      }

      // Kill switch
      if (killSwitchResult.status === 'fulfilled' && killSwitchResult.value) {
        const ks = killSwitchResult.value;
        // Auto-deactivate if deactivate_at has passed
        if (ks.is_active && ks.deactivate_at && new Date(ks.deactivate_at) <= new Date()) {
          setKillSwitchRef.current(null);
        } else {
          setKillSwitchRef.current(mapDbKillSwitchToStore(ks));
        }
      } else {
        setKillSwitchRef.current(null);
      }

      // Maintenance
      if (maintenanceResult.status === 'fulfilled' && maintenanceResult.value) {
        setMaintenanceRef.current(mapDbMaintenanceToStore(maintenanceResult.value));
      }
    } catch (error) {
      console.error('[SupabaseSync] fetchGlobalData error:', error);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  //  Realtime subscriptions – user-specific data
  //
  //  CRITICAL: .on() must be called BEFORE .subscribe().
  //  Each channel gets a unique suffix to prevent the
  //  "cannot add callbacks after subscribe" error that
  //  occurs when supabase.channel() returns an existing
  //  already-subscribed channel with the same name.
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id || !isAuthenticated) {
      // Clean up user-specific channels when not authenticated
      userChannelsRef.current.forEach(safeRemoveChannel);
      userChannelsRef.current = [];
      supabaseUuidRef.current = null;
      return;
    }

    const firebaseUid = user.id;
    let cancelled = false;

    // Clean up previous user channels before creating new ones
    userChannelsRef.current.forEach(safeRemoveChannel);
    userChannelsRef.current = [];

    // Debounced refresh helpers to prevent excessive re-renders from rapid events
    const debouncedRefreshTransactions = debounce(() => {
      void refreshTransactions();
    }, 300);
    const debouncedRefreshNotifications = debounce(() => {
      void refreshNotifications();
    }, 300);

    // First resolve the Supabase UUID, then set up subscriptions
    resolveSupabaseUuid(firebaseUid).then((supabaseUuid) => {
      if (!supabaseUuid || cancelled) return;

      const suf = uniqueSuffix();

      // ── User data changes ──
      // .channel() → .on() → .subscribe()  (correct order!)
      const userChannel = supabase
        .channel(`user-${supabaseUuid}${suf}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${supabaseUuid}`,
          },
          (payload: { new: DbUser }) => {
            const dbUser = payload.new;
            if (dbUser) {
              const mapped = mapDbUserToStore(dbUser, firebaseUid);
              const currentUser = useAppStore.getState().user;
              if (currentUser) {
                const hasChanges =
                  currentUser.balanceYER !== mapped.balanceYER ||
                  currentUser.balanceSAR !== mapped.balanceSAR ||
                  currentUser.balanceUSD !== mapped.balanceUSD ||
                  currentUser.name !== mapped.name ||
                  currentUser.kycStatus !== mapped.kycStatus ||
                  currentUser.isBlocked !== mapped.isBlocked ||
                  currentUser.role !== mapped.role ||
                  currentUser.theme !== mapped.theme ||
                  currentUser.phone !== mapped.phone ||
                  currentUser.avatar !== mapped.avatar ||
                  currentUser.cardType !== mapped.cardType ||
                  currentUser.cardNumber !== mapped.cardNumber ||
                  currentUser.governorate !== mapped.governorate;

                if (hasChanges) {
                  setUserRef.current(mapped);
                }
              }
            }
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('[SupabaseSync] User channel subscribed');
          }
          if (status === 'CHANNEL_ERROR') {
            console.error('[SupabaseSync] User channel error');
          }
          if (status === 'TIMED_OUT') {
            console.warn('[SupabaseSync] User channel timed out');
          }
        });

      // ── Transactions changes ──
      // Chain ALL .on() calls BEFORE the single .subscribe()
      const txChannel = supabase
        .channel(`tx-${supabaseUuid}${suf}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${supabaseUuid}`,
          },
          () => {
            debouncedRefreshTransactions();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${supabaseUuid}`,
          },
          () => {
            debouncedRefreshTransactions();
          }
        )
        // Also listen for transactions where user is sender or receiver
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions',
            filter: `from_user_id=eq.${supabaseUuid}`,
          },
          () => {
            debouncedRefreshTransactions();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions',
            filter: `to_user_id=eq.${supabaseUuid}`,
          },
          () => {
            debouncedRefreshTransactions();
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('[SupabaseSync] Transactions channel subscribed');
          }
          if (status === 'CHANNEL_ERROR') {
            console.error('[SupabaseSync] Transactions channel error');
          }
          if (status === 'TIMED_OUT') {
            console.warn('[SupabaseSync] Transactions channel timed out');
          }
        });

      // ── Notifications changes ──
      const notifChannel = supabase
        .channel(`notif-${supabaseUuid}${suf}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${supabaseUuid}`,
          },
          (payload: { new: DbNotification }) => {
            const dbNotif = payload.new;
            if (dbNotif) {
              const mapped = mapDbNotificationToStore(dbNotif);
              // Prepend the new notification instead of full refresh
              const currentNotifs = useAppStore.getState().notifications;
              // Avoid duplicate if it's already there
              if (!currentNotifs.find((n) => n.id === mapped.id)) {
                setNotificationsRef.current([mapped, ...currentNotifs]);
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${supabaseUuid}`,
          },
          () => {
            debouncedRefreshNotifications();
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log('[SupabaseSync] Notifications channel subscribed');
          }
          if (status === 'CHANNEL_ERROR') {
            console.error('[SupabaseSync] Notifications channel error');
          }
          if (status === 'TIMED_OUT') {
            console.warn('[SupabaseSync] Notifications channel timed out');
          }
        });

      userChannelsRef.current = [userChannel, txChannel, notifChannel];
    });

    return () => {
      cancelled = true;
      // Remove user-specific channels
      userChannelsRef.current.forEach(safeRemoveChannel);
      userChannelsRef.current = [];
    };
  }, [user?.id, isAuthenticated, resolveSupabaseUuid, refreshTransactions, refreshNotifications]);

  // ─────────────────────────────────────────────────────────
  //  Realtime subscriptions – global (public) data
  //
  //  Each channel gets a unique suffix to prevent name
  //  collisions when React StrictMode remounts the
  //  component before the old channel is cleaned up.
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    const suf = uniqueSuffix();

    // Clean up any leftover channels from a previous mount
    globalChannelsRef.current.forEach(safeRemoveChannel);
    globalChannelsRef.current = [];

    // Debounced refresh callbacks to prevent excessive re-renders
    const debouncedFetchGlobalData = debounce(() => {
      void fetchGlobalData();
    }, 300);

    // ── Sections ──
    const sectionsChannel = supabase
      .channel(`sections-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sections' },
        async () => {
          try {
            const sections = await supabaseService.getSections();
            const categories = sections.filter((s) => s.is_visible).map(mapDbSectionToCategory);
            setCategoriesRef.current(categories);

            const sectionsMap: Record<string, DbSection> = {};
            for (const s of sections) {
              sectionsMap[s.id] = s;
            }
            setFbSectionsRef.current(sectionsMap as Record<string, any>);
          } catch (error) {
            console.error('[SupabaseSync] Sections realtime refresh error:', error);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[SupabaseSync] Sections channel error:', status);
        }
      });

    // ── Sub Sections ──
    const subSectionsChannel = supabase
      .channel(`sub-sections-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sub_sections' },
        debounce(async () => {
          try {
            // Refresh sections to get sub-section updates
            const sections = await supabaseService.getSections();
            const sectionsMap: Record<string, DbSection> = {};
            for (const s of sections) {
              sectionsMap[s.id] = s;
            }
            setFbSectionsRef.current(sectionsMap as Record<string, any>);
          } catch (error) {
            console.error('[SupabaseSync] Sub-sections realtime refresh error:', error);
          }
        }, 300)
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[SupabaseSync] Sub-sections channel error:', status);
        }
      });

    // ── Service Providers ──
    const providersChannel = supabase
      .channel(`providers-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_providers' },
        debounce(async () => {
          try {
            const providers = await supabaseService.getServiceProviders();
            setProvidersRef.current(providers.map(mapDbProviderToStore));

            // Also refresh packages since providers may have changed
            const packagePromises = providers.map((p: DbServiceProvider) =>
              supabaseService.getProductPackages(p.id).catch(() => [] as DbProductPackage[])
            );
            const packageResults = await Promise.allSettled(packagePromises);
            const allPackages: ProductPackage[] = [];
            for (const result of packageResults) {
              if (result.status === 'fulfilled' && result.value) {
                allPackages.push(...result.value.map(mapDbPackageToStore));
              }
            }
            setPackagesRef.current(allPackages);
          } catch (error) {
            console.error('[SupabaseSync] Providers realtime refresh error:', error);
          }
        }, 300)
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[SupabaseSync] Providers channel error:', status);
        }
      });

    // ── Product Packages ──
    const packagesChannel = supabase
      .channel(`packages-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_packages' },
        debounce(async () => {
          try {
            // Refetch all providers to get their packages
            const providers = await supabaseService.getServiceProviders();
            const packagePromises = providers.map((p: DbServiceProvider) =>
              supabaseService.getProductPackages(p.id).catch(() => [] as DbProductPackage[])
            );
            const packageResults = await Promise.allSettled(packagePromises);
            const allPackages: ProductPackage[] = [];
            for (const result of packageResults) {
              if (result.status === 'fulfilled' && result.value) {
                allPackages.push(...result.value.map(mapDbPackageToStore));
              }
            }
            setPackagesRef.current(allPackages);
          } catch (error) {
            console.error('[SupabaseSync] Packages realtime refresh error:', error);
          }
        }, 300)
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[SupabaseSync] Packages channel error:', status);
        }
      });

    // ── Exchange Rates ──
    const exchangeRatesChannel = supabase
      .channel(`exchange-rates-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'exchange_rates' },
        debounce(async () => {
          try {
            const rate = await supabaseService.getExchangeRates();
            if (rate) {
              setExchangeRatesRef.current(mapDbExchangeRateToStore(rate));
            }
          } catch (error) {
            console.error('[SupabaseSync] Exchange rates realtime refresh error:', error);
          }
        }, 300)
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[SupabaseSync] Exchange rates channel error:', status);
        }
      });

    // ── Banners ──
    const bannersChannel = supabase
      .channel(`banners-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'banners' },
        debounce(async () => {
          try {
            const banners = await supabaseService.getBanners();
            void banners;
          } catch (error) {
            console.error('[SupabaseSync] Banners realtime refresh error:', error);
          }
        }, 300)
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[SupabaseSync] Banners channel error:', status);
        }
      });

    // ── Feature Flags ──
    const featureFlagsChannel = supabase
      .channel(`feature-flags-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feature_flags' },
        debounce(async () => {
          try {
            const flags = await supabaseService.getFeatureFlags();
            setFeatureFlagsRef.current(mapDbFeatureFlagsToStore(flags));
          } catch (error) {
            console.error('[SupabaseSync] Feature flags realtime refresh error:', error);
          }
        }, 300)
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[SupabaseSync] Feature flags channel error:', status);
        }
      });

    // ── Kill Switch ──
    const killSwitchChannel = supabase
      .channel(`kill-switch-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kill_switch' },
        debounce(async () => {
          try {
            const ks = await supabaseService.getKillSwitch();
            if (ks) {
              if (ks.is_active && ks.deactivate_at && new Date(ks.deactivate_at) <= new Date()) {
                setKillSwitchRef.current(null);
              } else {
                setKillSwitchRef.current(mapDbKillSwitchToStore(ks));
              }
            } else {
              setKillSwitchRef.current(null);
            }
          } catch (error) {
            console.error('[SupabaseSync] Kill switch realtime refresh error:', error);
          }
        }, 300)
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[SupabaseSync] Kill switch channel error:', status);
        }
      });

    // ── Maintenance ──
    const maintenanceChannel = supabase
      .channel(`maintenance-public${suf}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance' },
        debounce(async () => {
          try {
            const maintenance = await supabaseService.getMaintenance();
            if (maintenance) {
              setMaintenanceRef.current(mapDbMaintenanceToStore(maintenance));
            }
          } catch (error) {
            console.error('[SupabaseSync] Maintenance realtime refresh error:', error);
          }
        }, 300)
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[SupabaseSync] Maintenance channel error:', status);
        }
      });

    globalChannelsRef.current = [
      sectionsChannel,
      subSectionsChannel,
      providersChannel,
      packagesChannel,
      exchangeRatesChannel,
      bannersChannel,
      featureFlagsChannel,
      killSwitchChannel,
      maintenanceChannel,
    ];

    return () => {
      globalChannelsRef.current.forEach(safeRemoveChannel);
      globalChannelsRef.current = [];
    };
  }, [fetchGlobalData]); // Run once on mount (fetchGlobalData is stable via useCallback with [])

  // ─────────────────────────────────────────────────────────
  //  Initialize G2Bulk API provider on first load
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    const initProvider = async () => {
      try {
        const { initializeDefaultProviders } = await import('@/lib/api-providers');
        await initializeDefaultProviders();
      } catch (error) {
        console.error('[SupabaseSync] Failed to initialize API providers:', error);
      }
    };
    initProvider();
  }, []);

  // ─────────────────────────────────────────────────────────
  //  Initial data fetch on mount
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    // Fetch global data regardless of auth state
    fetchGlobalData();

    // Fetch user-specific data if authenticated
    if (isAuthenticated && user?.id) {
      refreshUser();
      refreshNotifications();
    }
  }, [isAuthenticated, user?.id, fetchGlobalData, refreshUser, refreshNotifications]);

  // ─────────────────────────────────────────────────────────
  //  Refresh on window focus / visibility change / online
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    const handleRefresh = () => {
      if (isAuthenticatedRef.current && firebaseUidRef.current) {
        refreshUser();
        refreshNotifications();
      }
      // Always refresh global data
      fetchGlobalData();
    };

    const handleFocus = () => {
      handleRefresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRefresh();
      }
    };

    const handleOnline = () => {
      handleRefresh();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [refreshUser, refreshNotifications, fetchGlobalData]);

  return { refreshUser };
}