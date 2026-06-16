'use client';

import { useEffect } from 'react';
import { useI18nStore } from '@/lib/i18n';

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const language = useI18nStore((s) => s.language);

  useEffect(() => {
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    const htmlEl = document.documentElement;
    htmlEl.setAttribute('dir', dir);
    htmlEl.setAttribute('lang', language);

    // Add direction class for CSS targeting
    htmlEl.classList.remove('dir-rtl', 'dir-ltr');
    htmlEl.classList.add(`dir-${dir}`);

    // Update body font family based on language
    if (language === 'ar') {
      document.body.style.fontFamily = "'Segoe UI', Tahoma, 'Noto Sans Arabic', 'Arial', sans-serif";
    } else {
      document.body.style.fontFamily = "'Segoe UI', Tahoma, 'Arial', sans-serif";
    }
  }, [language]);

  return <>{children}</>;
}
