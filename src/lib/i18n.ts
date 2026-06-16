'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCallback, useMemo } from 'react';
import ar from './translations/ar';
import en from './translations/en';
import type { Translations } from './translations/ar';

export type Language = 'ar' | 'en';

const translations: Record<Language, Translations> = { ar, en };

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      language: 'ar',
      setLanguage: (language: Language) => set({ language }),
    }),
    {
      name: 'janoub-i18n',
    }
  )
);

// Deep access a nested key like 'nav.home' from translations object
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // fallback: return the key path itself
    }
  }
  return typeof current === 'string' ? current : path;
}

// Replace {n} placeholders with values
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

export type TFunction = (key: string, params?: Record<string, string | number>) => string;

export function useTranslation() {
  const language = useI18nStore((s) => s.language);
  const setLanguage = useI18nStore((s) => s.setLanguage);

  const t: TFunction = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const dict = translations[language] || translations.ar;
      const value = getNestedValue(dict as unknown as Record<string, unknown>, key);
      return interpolate(value, params);
    },
    [language]
  );

  const dir = language === 'ar' ? 'rtl' : 'ltr';
  const isRTL = language === 'ar';

  return useMemo(() => ({ language, setLanguage, t, dir, isRTL }), [language, setLanguage, t, dir, isRTL]);
}

// Non-hook access for use outside components
export function getTranslation(lang?: Language): { t: TFunction; dir: 'rtl' | 'ltr'; isRTL: boolean } {
  const language = lang || useI18nStore.getState().language;
  const dict = translations[language] || translations.ar;
  const t: TFunction = (key: string, params?: Record<string, string | number>) => {
    const value = getNestedValue(dict as unknown as Record<string, unknown>, key);
    return interpolate(value, params);
  };
  return { t, dir: language === 'ar' ? 'rtl' : 'ltr', isRTL: language === 'ar' };
}

// Helper to get current language without hooks
export function getCurrentLanguage(): Language {
  return useI18nStore.getState().language;
}

// Helper to format numbers based on current language
export function formatLocalizedNumber(num: number, lang?: Language): string {
  const language = lang || useI18nStore.getState().language;
  return num.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US');
}

// Helper to format dates based on current language
export function formatLocalizedDate(date: Date | string, options?: Intl.DateTimeFormatOptions, lang?: Language): string {
  const language = lang || useI18nStore.getState().language;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', options || { year: 'numeric', month: 'short', day: 'numeric' });
}

// Helper to format relative time based on current language
export function formatRelativeTime(dateString: string, lang?: Language): string {
  const language = lang || useI18nStore.getState().language;
  const now = new Date().getTime();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffMs / 604800000);

  const { t } = getTranslation(language);

  if (diffMins < 1) return t('time.now');
  if (diffMins < 60) return t('time.minutesAgo', { n: diffMins });
  if (diffHours < 24) return t('time.hoursAgo', { n: diffHours });
  if (diffDays < 7) return t('time.daysAgo', { n: diffDays });
  return t('time.weeksAgo', { n: diffWeeks });
}

export { ar, en };
export type { Translations };
