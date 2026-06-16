'use client';

import { useEffect, useRef } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { useAppStore, defaultOwnerSettings } from '@/lib/store';
import type { OwnerSettings } from '@/lib/store';

/**
 * Hook that listens to Firebase ownerSettings/ in real-time
 * and updates the Zustand store with the current values.
 * Components use this hook to get owner-overridable values with defaults.
 */
export function useOwnerSettings() {
  const { ownerSettings, setOwnerSettings } = useAppStore();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const settingsRef = ref(database, 'ownerSettings');

    const unsubscribe = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const merged: OwnerSettings = {
          appNameAr: data.appNameAr || defaultOwnerSettings.appNameAr,
          appNameEn: data.appNameEn || defaultOwnerSettings.appNameEn,
          icons: data.icons || defaultOwnerSettings.icons,
          cardColors: {
            YER: { ...defaultOwnerSettings.cardColors.YER, ...(data.cardColors?.YER || {}) },
            SAR: { ...defaultOwnerSettings.cardColors.SAR, ...(data.cardColors?.SAR || {}) },
            USD: { ...defaultOwnerSettings.cardColors.USD, ...(data.cardColors?.USD || {}) },
          },
          sections: data.sections || defaultOwnerSettings.sections,
          banners: data.banners || defaultOwnerSettings.banners,
          theme: { ...defaultOwnerSettings.theme, ...(data.theme || {}) },
          general: { ...defaultOwnerSettings.general, ...(data.general || {}) },
          deployment: { ...defaultOwnerSettings.deployment, ...(data.deployment || {}) },
        };
        setOwnerSettings(merged);
      }
    }, (error) => {
      console.error('Owner settings listener error:', error);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
    };
  }, [setOwnerSettings]);

  return ownerSettings;
}

/**
 * Check if a user has owner access
 */
export function isOwnerUser(user: { role: string; email?: string } | null): boolean {
  if (!user) return false;
  if (user.role === 'owner') return true;
  if (user.role === 'super_admin') return true;
  if (user.email && user.email.toLowerCase() === 'm775371829@gmail.com') return true;
  return false;
}

/**
 * Get the app name with owner override
 */
export function getAppName(ownerSettings: OwnerSettings, lang: 'ar' | 'en' = 'ar'): string {
  return lang === 'ar' ? ownerSettings.appNameAr : ownerSettings.appNameEn;
}

/**
 * Get icon with owner override
 */
export function getOwnerIcon(ownerSettings: OwnerSettings, key: string, fallback: string = ''): string {
  return ownerSettings.icons[key] || fallback;
}

/**
 * Get card colors with owner override
 */
export function getCardColors(ownerSettings: OwnerSettings, currency: 'YER' | 'SAR' | 'USD') {
  return ownerSettings.cardColors[currency];
}

/**
 * Get visible sections sorted by order
 */
export function getVisibleSections(ownerSettings: OwnerSettings) {
  return ownerSettings.sections
    .filter(s => s.isVisible)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get active banners
 */
export function getActiveBanners(ownerSettings: OwnerSettings, screen?: string) {
  return ownerSettings.banners
    .filter(b => {
      if (!b.isActive) return false;
      if (screen && b.showOnScreens && b.showOnScreens.length > 0) {
        return b.showOnScreens.includes(screen);
      }
      return true;
    })
    .sort((a, b) => a.order - b.order);
}

/**
 * Get theme with owner override
 */
export function getThemeColors(ownerSettings: OwnerSettings) {
  return ownerSettings.theme;
}
