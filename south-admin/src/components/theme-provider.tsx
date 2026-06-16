'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect } from 'react';
import { useAdminStore } from '@/lib/store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="south-admin-theme"
      disableTransitionOnChange
    >
      <ThemeSync>{children}</ThemeSync>
    </NextThemesProvider>
  );
}

function ThemeSync({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useAdminStore();

  // Sync zustand theme with next-themes on mount
  useEffect(() => {
    const stored = localStorage.getItem('south-admin-theme');
    if (stored) {
      const parsed = stored.replace(/"/g, '');
      if (parsed === 'dark' || parsed === 'light') {
        setTheme(parsed);
      }
    }
  }, [setTheme]);

  return <>{children}</>;
}
