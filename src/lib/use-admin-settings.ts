'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, get, Unsubscribe } from 'firebase/database';
import {
  useAppStore,
  type CardColor,
  type MaintenanceMode,
  type ForceUpdate,
  type InvestmentPlan,
  type ServiceProvider,
  type ProductPackage,
  type FeatureFlags,
  type TransactionLimits,
  defaultFeatureFlags,
  defaultTransactionLimits,
} from '@/lib/store';

// ─── Types for settings NOT yet in the Zustand store ───────────────────────

export interface VisibilitySettings {
  sections: Record<string, boolean>;
  providers: Record<string, boolean>;
  features: Record<string, boolean>;
}

export interface SocialLinks {
  whatsapp: string;
  contactAdmin: string;
  contactAdminMessage: string;
}

export interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  order: number;
  url?: string;
  link?: string;
  urlType?: string;
}

export interface Section {
  id: string;
  name: string;
  iconKey: string;
  order: number;
  isVisible: boolean;
  categoryId: string;
}

// ─── Firebase path constants ───────────────────────────────────────────────

const PATHS = {
  cardColors: 'adminSettings/cardColors',
  maintenance: 'adminSettings/maintenance',
  forceUpdate: 'adminSettings/forceUpdate',
  visibility: 'adminSettings/visibility',
  investmentPlans: 'adminSettings/investmentPlans',
  exchangeRates: 'adminSettings/exchangeRates',
  features: 'adminSettings/features',
  limits: 'adminSettings/limits',
  socialLinks: 'adminSettings/socialLinks',
  banners: 'adminSettings/banners',
  sections: 'ownerSettings/sections',
  providers: 'providers',
  packages: 'packages',
} as const;

// ─── Default values ────────────────────────────────────────────────────────

const defaultVisibility: VisibilitySettings = {
  sections: {},
  providers: {},
  features: {},
};

const defaultSocialLinks: SocialLinks = {
  whatsapp: '',
  contactAdmin: '',
  contactAdminMessage: '',
};

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useAdminSettings() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  // Local state for settings NOT in the Zustand store
  const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySettings>(defaultVisibility);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(defaultSocialLinks);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  // Track loading state
  const [isLoading, setIsLoading] = useState(true);

  // Keep refs to unsubscribers so we can tear them down
  const unsubscribersRef = useRef<Map<string, Unsubscribe>>(new Map());

  // ─── Helper: convert Firebase banners object → sorted array ────────────
  const parseBanners = useCallback((raw: Record<string, any> | null): Banner[] => {
    if (!raw) return [];
    return Object.entries(raw)
      .map(([id, val]) => ({
        id,
        title: val?.title ?? '',
        description: val?.description ?? '',
        imageUrl: val?.imageUrl ?? '',
        isActive: val?.isActive ?? false,
        order: val?.order ?? 0,
        url: val?.url,
        link: val?.link,
        urlType: val?.urlType,
      }))
      .filter((b) => b.isActive)
      .sort((a, b) => a.order - b.order);
  }, []);

  // ─── Helper: convert Firebase sections object → sorted array ──────────
  const parseSections = useCallback((raw: Record<string, any> | null): Section[] => {
    if (!raw) return [];
    return Object.entries(raw)
      .map(([id, val]) => ({
        id,
        name: val?.name ?? '',
        iconKey: val?.iconKey ?? '',
        order: val?.order ?? 0,
        isVisible: val?.isVisible ?? true,
        categoryId: val?.categoryId ?? '',
      }))
      .sort((a, b) => a.order - b.order);
  }, []);

  // ─── Attach a single real-time listener ────────────────────────────────
  const attachListener = useCallback(
    (pathKey: string, path: string, handler: (snapshot: any) => void) => {
      const dbRef = ref(database, path);
      const unsubscribe = onValue(dbRef, handler, (error) => {
        console.error(`[useAdminSettings] onValue error on "${path}":`, error);
      });
      unsubscribersRef.current.set(pathKey, unsubscribe);
    },
    [],
  );

  // ─── Set up listeners that require authentication ──────────────────────
  const setupAuthenticatedListeners = useCallback(() => {
    const store = useAppStore.getState();

    // 1. Card colors
    attachListener('cardColors', PATHS.cardColors, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        store.setCardColors(data as CardColor);
      }
    });

    // 2. Visibility settings
    attachListener('visibility', PATHS.visibility, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setVisibilitySettings({
          sections: data.sections ?? {},
          providers: data.providers ?? {},
          features: data.features ?? {},
        });
      } else {
        setVisibilitySettings(defaultVisibility);
      }
    });

    // 3. Investment plans
    attachListener('investmentPlans', PATHS.investmentPlans, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const plans: InvestmentPlan[] = Array.isArray(data)
          ? data.filter(Boolean)
          : Object.values(data).filter(Boolean);
        store.setInvestmentPlans(plans);
      } else {
        store.setInvestmentPlans([]);
      }
    });

    // 4. Exchange rates
    attachListener('exchangeRates', PATHS.exchangeRates, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        store.setExchangeRates({
          YER: data.YER ?? 1,
          SAR: data.SAR ?? 1,
          USD: data.USD ?? 1,
        });
      }
    });

    // 5. Social links
    attachListener('socialLinks', PATHS.socialLinks, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSocialLinks({
          whatsapp: data.whatsapp ?? '',
          contactAdmin: data.contactAdmin ?? '',
          contactAdminMessage: data.contactAdminMessage ?? '',
        });
      } else {
        setSocialLinks(defaultSocialLinks);
      }
    });

    // 6. Banners
    attachListener('banners', PATHS.banners, (snapshot) => {
      const data = snapshot.val();
      setBanners(parseBanners(data));
    });

    // 7. Sections / categories (owner settings)
    attachListener('sections', PATHS.sections, (snapshot) => {
      const data = snapshot.val();
      setSections(parseSections(data));
    });

    // 8. Providers (from Firebase)
    attachListener('providers', PATHS.providers, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const entries = Object.entries(data) as [string, any][];
        const providers: ServiceProvider[] = entries
          .filter(([key, p]) => p && p.name)
          .map(([key, p]) => ({
            id: key,
            categoryId: p.categoryId || 'telecom',
            name: p.name || '',
            color: p.color || '#6C3CE1',
            icon: p.icon || '',
            isActive: p.isActive !== false,
            inputLabel: p.inputLabel || 'رقم الهاتف',
            inputType: p.inputType || 'text',
            inputPrefix: p.inputPrefix || '',
          }));
        store.setProviders(providers);
      }
    });

    // 9. Packages (from Firebase)
    attachListener('packages', PATHS.packages, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const entries = Object.entries(data) as [string, any][];
        const packages: ProductPackage[] = entries
          .filter(([key, p]) => p && p.name && p.providerId)
          .map(([key, p]) => ({
            id: key,
            providerId: p.providerId || '',
            name: p.name || '',
            price: p.price || 0,
            currency: p.currency || 'YER',
            executionType: p.executionType || 'manual',
            isActive: p.isActive !== false,
          }));
        store.setPackages(packages);
      }
    });

    // 10. Feature flags (from admin)
    attachListener('features', PATHS.features, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const flags: Partial<FeatureFlags> = {};
        // Map Firebase keys to FeatureFlags, defaulting to true for booleans
        if (data.transfersEnabled !== undefined) flags.transfersEnabled = !!data.transfersEnabled;
        if (data.depositsEnabled !== undefined) flags.depositsEnabled = !!data.depositsEnabled;
        if (data.withdrawalsEnabled !== undefined) flags.withdrawalsEnabled = !!data.withdrawalsEnabled;
        if (data.exchangeEnabled !== undefined) flags.exchangeEnabled = !!data.exchangeEnabled;
        if (data.servicesEnabled !== undefined) flags.servicesEnabled = !!data.servicesEnabled;
        if (data.rechargeEnabled !== undefined) flags.rechargeEnabled = !!data.rechargeEnabled;
        if (data.billsEnabled !== undefined) flags.billsEnabled = !!data.billsEnabled;
        if (data.investmentEnabled !== undefined) flags.investmentEnabled = !!data.investmentEnabled;
        if (data.cryptoEnabled !== undefined) flags.cryptoEnabled = !!data.cryptoEnabled;
        if (data.giftCodesEnabled !== undefined) flags.giftCodesEnabled = !!data.giftCodesEnabled;
        if (data.qrPaymentsEnabled !== undefined) flags.qrPaymentsEnabled = !!data.qrPaymentsEnabled;
        if (data.referralEnabled !== undefined) flags.referralEnabled = !!data.referralEnabled;
        if (data.notificationsEnabled !== undefined) flags.notificationsEnabled = !!data.notificationsEnabled;
        if (data.biometricEnabled !== undefined) flags.biometricEnabled = !!data.biometricEnabled;
        if (data.pinEnabled !== undefined) flags.pinEnabled = !!data.pinEnabled;
        if (data.darkModeEnabled !== undefined) flags.darkModeEnabled = !!data.darkModeEnabled;
        if (data.maintenanceMode !== undefined) flags.maintenanceMode = !!data.maintenanceMode;
        if (data.maintenanceMessage !== undefined) flags.maintenanceMessage = String(data.maintenanceMessage || '');
        if (data.registrationEnabled !== undefined) flags.registrationEnabled = !!data.registrationEnabled;
        store.setFeatureFlags(flags);
      } else {
        // No features data in Firebase — use defaults (all enabled)
        store.setFeatureFlags(defaultFeatureFlags);
      }
    });

    // 11. Transaction limits (from admin)
    attachListener('limits', PATHS.limits, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const limits: Partial<TransactionLimits> = {};
        if (data.maxSingleTransfer !== undefined) limits.maxSingleTransfer = Number(data.maxSingleTransfer) || defaultTransactionLimits.maxSingleTransfer;
        if (data.maxDailyTransfer !== undefined) limits.maxDailyTransfer = Number(data.maxDailyTransfer) || defaultTransactionLimits.maxDailyTransfer;
        if (data.maxMonthlyTransfer !== undefined) limits.maxMonthlyTransfer = Number(data.maxMonthlyTransfer) || defaultTransactionLimits.maxMonthlyTransfer;
        if (data.maxSingleDeposit !== undefined) limits.maxSingleDeposit = Number(data.maxSingleDeposit) || defaultTransactionLimits.maxSingleDeposit;
        if (data.maxDailyDeposit !== undefined) limits.maxDailyDeposit = Number(data.maxDailyDeposit) || defaultTransactionLimits.maxDailyDeposit;
        if (data.maxBalance !== undefined) limits.maxBalance = Number(data.maxBalance) || defaultTransactionLimits.maxBalance;
        store.setTransactionLimits(limits);
      } else {
        // No limits data in Firebase — use defaults
        store.setTransactionLimits(defaultTransactionLimits);
      }
    });
  }, [attachListener, parseBanners, parseSections]);

  // ─── Set up global listeners (always active, even without auth) ────────
  const setupGlobalListeners = useCallback(() => {
    const store = useAppStore.getState();

    // Maintenance mode - ALWAYS listen, even when not authenticated
    attachListener('maintenance', PATHS.maintenance, (snapshot) => {
      const data = snapshot.val();
      store.setMaintenance(data as MaintenanceMode | null);
    });

    // Force update - ALWAYS listen, even when not authenticated
    attachListener('forceUpdate', PATHS.forceUpdate, (snapshot) => {
      const data = snapshot.val();
      store.setForceUpdate(data as ForceUpdate | null);
    });

    // Feature flags - ALWAYS listen, even when not authenticated
    // This ensures maintenance mode from feature flags works immediately
    attachListener('featuresGlobal', PATHS.features, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const flags: Partial<FeatureFlags> = {};
        if (data.transfersEnabled !== undefined) flags.transfersEnabled = !!data.transfersEnabled;
        if (data.depositsEnabled !== undefined) flags.depositsEnabled = !!data.depositsEnabled;
        if (data.withdrawalsEnabled !== undefined) flags.withdrawalsEnabled = !!data.withdrawalsEnabled;
        if (data.exchangeEnabled !== undefined) flags.exchangeEnabled = !!data.exchangeEnabled;
        if (data.servicesEnabled !== undefined) flags.servicesEnabled = !!data.servicesEnabled;
        if (data.rechargeEnabled !== undefined) flags.rechargeEnabled = !!data.rechargeEnabled;
        if (data.billsEnabled !== undefined) flags.billsEnabled = !!data.billsEnabled;
        if (data.investmentEnabled !== undefined) flags.investmentEnabled = !!data.investmentEnabled;
        if (data.cryptoEnabled !== undefined) flags.cryptoEnabled = !!data.cryptoEnabled;
        if (data.giftCodesEnabled !== undefined) flags.giftCodesEnabled = !!data.giftCodesEnabled;
        if (data.qrPaymentsEnabled !== undefined) flags.qrPaymentsEnabled = !!data.qrPaymentsEnabled;
        if (data.referralEnabled !== undefined) flags.referralEnabled = !!data.referralEnabled;
        if (data.notificationsEnabled !== undefined) flags.notificationsEnabled = !!data.notificationsEnabled;
        if (data.biometricEnabled !== undefined) flags.biometricEnabled = !!data.biometricEnabled;
        if (data.pinEnabled !== undefined) flags.pinEnabled = !!data.pinEnabled;
        if (data.darkModeEnabled !== undefined) flags.darkModeEnabled = !!data.darkModeEnabled;
        if (data.maintenanceMode !== undefined) flags.maintenanceMode = !!data.maintenanceMode;
        if (data.maintenanceMessage !== undefined) flags.maintenanceMessage = String(data.maintenanceMessage || '');
        if (data.registrationEnabled !== undefined) flags.registrationEnabled = !!data.registrationEnabled;
        store.setFeatureFlags(flags);
      } else {
        store.setFeatureFlags(defaultFeatureFlags);
      }
    });
  }, [attachListener]);

  // ─── Tear down all listeners ───────────────────────────────────────────
  const teardownListeners = useCallback(() => {
    unsubscribersRef.current.forEach((unsubscribe) => unsubscribe());
    unsubscribersRef.current.clear();
  }, []);

  // ─── Tear down only authenticated listeners ────────────────────────────
  const teardownAuthenticatedListeners = useCallback(() => {
    const authKeys = ['cardColors', 'visibility', 'investmentPlans', 'exchangeRates', 'features', 'limits', 'socialLinks', 'banners', 'sections', 'providers', 'packages'];
    authKeys.forEach((key) => {
      const unsub = unsubscribersRef.current.get(key);
      if (unsub) {
        unsub();
        unsubscribersRef.current.delete(key);
      }
    });
  }, []);

  // ─── Lifecycle: global listeners (always on) ───────────────────────────
  useEffect(() => {
    setupGlobalListeners();

    return () => {
      // Only tear down global listeners on unmount
      const globalKeys = ['maintenance', 'forceUpdate', 'featuresGlobal'];
      globalKeys.forEach((key) => {
        const unsub = unsubscribersRef.current.get(key);
        if (unsub) {
          unsub();
          unsubscribersRef.current.delete(key);
        }
      });
    };
  }, [setupGlobalListeners]);

  // ─── Lifecycle: authenticated listeners (attach/detach on auth) ────────
  useEffect(() => {
    if (isAuthenticated) {
      setupAuthenticatedListeners();
      // Allow a short grace period for first callbacks to arrive
      const timer = setTimeout(() => setIsLoading(false), 1500);
      return () => {
        clearTimeout(timer);
        teardownAuthenticatedListeners();
      };
    } else {
      teardownAuthenticatedListeners();
    }
  }, [isAuthenticated, setupAuthenticatedListeners, teardownAuthenticatedListeners]);

  // ─── Manual refresh (pull-to-refresh) ──────────────────────────────────
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    const store = useAppStore.getState();

    const fetchPromises: Promise<void>[] = [
      // 1. Card colors
      get(ref(database, PATHS.cardColors)).then((snap) => {
        const data = snap.val();
        if (data) store.setCardColors(data as CardColor);
      }),

      // 2. Maintenance
      get(ref(database, PATHS.maintenance)).then((snap) => {
        store.setMaintenance(snap.val() as MaintenanceMode | null);
      }),

      // 3. Force update
      get(ref(database, PATHS.forceUpdate)).then((snap) => {
        store.setForceUpdate(snap.val() as ForceUpdate | null);
      }),

      // 4. Visibility
      get(ref(database, PATHS.visibility)).then((snap) => {
        const data = snap.val();
        if (data) {
          setVisibilitySettings({
            sections: data.sections ?? {},
            providers: data.providers ?? {},
            features: data.features ?? {},
          });
        } else {
          setVisibilitySettings(defaultVisibility);
        }
      }),

      // 5. Investment plans
      get(ref(database, PATHS.investmentPlans)).then((snap) => {
        const data = snap.val();
        if (data) {
          const plans: InvestmentPlan[] = Array.isArray(data)
            ? data.filter(Boolean)
            : Object.values(data).filter(Boolean);
          store.setInvestmentPlans(plans);
        } else {
          store.setInvestmentPlans([]);
        }
      }),

      // 6. Exchange rates
      get(ref(database, PATHS.exchangeRates)).then((snap) => {
        const data = snap.val();
        if (data) {
          store.setExchangeRates({
            YER: data.YER ?? 1,
            SAR: data.SAR ?? 1,
            USD: data.USD ?? 1,
          });
        }
      }),

      // 7. Social links
      get(ref(database, PATHS.socialLinks)).then((snap) => {
        const data = snap.val();
        if (data) {
          setSocialLinks({
            whatsapp: data.whatsapp ?? '',
            contactAdmin: data.contactAdmin ?? '',
            contactAdminMessage: data.contactAdminMessage ?? '',
          });
        } else {
          setSocialLinks(defaultSocialLinks);
        }
      }),

      // 8. Banners
      get(ref(database, PATHS.banners)).then((snap) => {
        setBanners(parseBanners(snap.val()));
      }),

      // 9. Sections
      get(ref(database, PATHS.sections)).then((snap) => {
        setSections(parseSections(snap.val()));
      }),

      // 10. Providers (use Firebase key as ID)
      get(ref(database, PATHS.providers)).then((snap) => {
        const data = snap.val();
        if (data) {
          const entries = Object.entries(data) as [string, any][];
          const providers: ServiceProvider[] = entries
            .filter(([key, p]) => p && p.name)
            .map(([key, p]) => ({
              id: key,
              categoryId: p.categoryId || 'telecom',
              name: p.name || '',
              color: p.color || '#6C3CE1',
              icon: p.icon || '',
              isActive: p.isActive !== false,
              inputLabel: p.inputLabel || 'رقم الهاتف',
              inputType: p.inputType || 'text',
              inputPrefix: p.inputPrefix || '',
            }));
          store.setProviders(providers);
        }
      }),

      // 11. Packages (use Firebase key as ID)
      get(ref(database, PATHS.packages)).then((snap) => {
        const data = snap.val();
        if (data) {
          const entries = Object.entries(data) as [string, any][];
          const packages: ProductPackage[] = entries
            .filter(([key, p]) => p && p.name && p.providerId)
            .map(([key, p]) => ({
              id: key,
              providerId: p.providerId || '',
              name: p.name || '',
              price: p.price || 0,
              currency: p.currency || 'YER',
              executionType: p.executionType || 'manual',
              isActive: p.isActive !== false,
            }));
          store.setPackages(packages);
        }
      }),

      // 12. Feature flags
      get(ref(database, PATHS.features)).then((snap) => {
        const data = snap.val();
        if (data) {
          const flags: Partial<FeatureFlags> = {};
          if (data.transfersEnabled !== undefined) flags.transfersEnabled = !!data.transfersEnabled;
          if (data.depositsEnabled !== undefined) flags.depositsEnabled = !!data.depositsEnabled;
          if (data.withdrawalsEnabled !== undefined) flags.withdrawalsEnabled = !!data.withdrawalsEnabled;
          if (data.exchangeEnabled !== undefined) flags.exchangeEnabled = !!data.exchangeEnabled;
          if (data.servicesEnabled !== undefined) flags.servicesEnabled = !!data.servicesEnabled;
          if (data.rechargeEnabled !== undefined) flags.rechargeEnabled = !!data.rechargeEnabled;
          if (data.billsEnabled !== undefined) flags.billsEnabled = !!data.billsEnabled;
          if (data.investmentEnabled !== undefined) flags.investmentEnabled = !!data.investmentEnabled;
          if (data.cryptoEnabled !== undefined) flags.cryptoEnabled = !!data.cryptoEnabled;
          if (data.giftCodesEnabled !== undefined) flags.giftCodesEnabled = !!data.giftCodesEnabled;
          if (data.qrPaymentsEnabled !== undefined) flags.qrPaymentsEnabled = !!data.qrPaymentsEnabled;
          if (data.referralEnabled !== undefined) flags.referralEnabled = !!data.referralEnabled;
          if (data.notificationsEnabled !== undefined) flags.notificationsEnabled = !!data.notificationsEnabled;
          if (data.biometricEnabled !== undefined) flags.biometricEnabled = !!data.biometricEnabled;
          if (data.pinEnabled !== undefined) flags.pinEnabled = !!data.pinEnabled;
          if (data.darkModeEnabled !== undefined) flags.darkModeEnabled = !!data.darkModeEnabled;
          if (data.maintenanceMode !== undefined) flags.maintenanceMode = !!data.maintenanceMode;
          if (data.maintenanceMessage !== undefined) flags.maintenanceMessage = String(data.maintenanceMessage || '');
          if (data.registrationEnabled !== undefined) flags.registrationEnabled = !!data.registrationEnabled;
          store.setFeatureFlags(flags);
        }
      }),

      // 13. Transaction limits
      get(ref(database, PATHS.limits)).then((snap) => {
        const data = snap.val();
        if (data) {
          const limits: Partial<TransactionLimits> = {};
          if (data.maxSingleTransfer !== undefined) limits.maxSingleTransfer = Number(data.maxSingleTransfer) || defaultTransactionLimits.maxSingleTransfer;
          if (data.maxDailyTransfer !== undefined) limits.maxDailyTransfer = Number(data.maxDailyTransfer) || defaultTransactionLimits.maxDailyTransfer;
          if (data.maxMonthlyTransfer !== undefined) limits.maxMonthlyTransfer = Number(data.maxMonthlyTransfer) || defaultTransactionLimits.maxMonthlyTransfer;
          if (data.maxSingleDeposit !== undefined) limits.maxSingleDeposit = Number(data.maxSingleDeposit) || defaultTransactionLimits.maxSingleDeposit;
          if (data.maxDailyDeposit !== undefined) limits.maxDailyDeposit = Number(data.maxDailyDeposit) || defaultTransactionLimits.maxDailyDeposit;
          if (data.maxBalance !== undefined) limits.maxBalance = Number(data.maxBalance) || defaultTransactionLimits.maxBalance;
          store.setTransactionLimits(limits);
        }
      }),
    ];

    await Promise.allSettled(fetchPromises);
    setIsLoading(false);
  }, [parseBanners, parseSections]);

  // ─── Return value ──────────────────────────────────────────────────────

  // Read current Zustand values for convenience
  const cardColors = useAppStore((s) => s.cardColors);
  const maintenance = useAppStore((s) => s.maintenance);
  const forceUpdate = useAppStore((s) => s.forceUpdate);
  const investmentPlans = useAppStore((s) => s.investmentPlans);
  const exchangeRates = useAppStore((s) => s.exchangeRates);
  const providers = useAppStore((s) => s.providers);
  const packages = useAppStore((s) => s.packages);
  const featureFlags = useAppStore((s) => s.featureFlags);
  const transactionLimits = useAppStore((s) => s.transactionLimits);

  return {
    // Zustand-synced values
    cardColors,
    maintenance,
    forceUpdate,
    investmentPlans,
    exchangeRates,
    providers,
    packages,
    featureFlags,
    transactionLimits,

    // Local state (not in store yet)
    visibilitySettings,
    socialLinks,
    banners,
    sections,

    // Meta
    isLoading,
    refreshAll,
  } as const;
}
