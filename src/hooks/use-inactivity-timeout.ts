'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';

export interface InactivitySettings {
  enabled: boolean;
  timeoutMinutes: number; // 1, 3, 5, 10, 15
  warnBeforeSeconds: number; // default 30
}

const DEFAULT_SETTINGS: InactivitySettings = {
  enabled: true,
  timeoutMinutes: 5,
  warnBeforeSeconds: 30,
};

function getSettings(): InactivitySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem('inactivity-settings');
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: InactivitySettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('inactivity-settings', JSON.stringify(settings));
  } catch {}
}

export function useInactivityTimeout() {
  const { isAuthenticated, setPinLocked } = useAppStore();
  const [settings, setSettings] = useState<InactivitySettings>(getSettings);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (warnTimerRef.current) {
      clearTimeout(warnTimerRef.current);
      warnTimerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const lockApp = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    setIsLocked(true);
    setPinLocked(true);
  }, [setPinLocked, clearTimers]);

  const resetTimer = useCallback(() => {
    if (!settings.enabled || !isAuthenticated) {
      clearTimers();
      return;
    }

    clearTimers();
    setShowWarning(false);
    lastActivityRef.current = Date.now();

    const timeoutMs = settings.timeoutMinutes * 60 * 1000;
    const warnMs = timeoutMs - settings.warnBeforeSeconds * 1000;

    // Timer to show warning before logout
    warnTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setRemainingSeconds(settings.warnBeforeSeconds);

      // Start countdown
      countdownRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warnMs);

    // Timer to auto-lock
    timerRef.current = setTimeout(() => {
      lockApp();
    }, timeoutMs);
  }, [settings, isAuthenticated, clearTimers, lockApp]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<InactivitySettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      return updated;
    });
  }, []);

  // Continue button handler - resets the timer
  const handleContinue = useCallback(() => {
    setShowWarning(false);
    resetTimer();
  }, [resetTimer]);

  // Track user activity
  useEffect(() => {
    if (!settings.enabled || !isAuthenticated) {
      clearTimers();
      return;
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    let lastThrottle = 0;

    const handleActivity = () => {
      const now = Date.now();
      // Throttle: only reset timer every 30 seconds max
      if (now - lastThrottle < 30000) return;
      lastThrottle = now;
      resetTimer();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timer
    resetTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimers();
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [settings.enabled, isAuthenticated, resetTimer, clearTimers]);

  return {
    settings,
    updateSettings,
    showWarning,
    remainingSeconds,
    isLocked,
    handleContinue,
    lockApp,
  };
}
