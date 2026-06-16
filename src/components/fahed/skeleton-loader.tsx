'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';

// ========================================
// useLoadingState Hook
// Simulates loading for 1.5 seconds on initial render
// ========================================

export function useLoadingState(duration = 1500): boolean {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return isLoading;
}

// ========================================
// Base Pulse Skeleton Block
// ========================================

function SkeletonBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <motion.div
      className={className}
      style={{
        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        borderRadius: 8,
        ...style,
      }}
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// ========================================
// Balance Card Skeleton
// ========================================

export function BalanceCardSkeleton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="px-8" dir="ltr">
      <div
        className="rounded-[20px] overflow-hidden"
        style={{
          height: 195,
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
        }}
        dir="rtl"
      >
        <div className="p-6 h-full flex flex-col justify-between">
          {/* Top row - Logo + Eye */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <SkeletonBlock className="w-9 h-9 rounded-lg" />
              <div className="flex flex-col gap-1.5">
                <SkeletonBlock className="w-14 h-3.5" />
                <SkeletonBlock className="w-12 h-2.5" />
              </div>
            </div>
            <SkeletonBlock className="w-5 h-5 rounded-full" />
          </div>

          {/* Balance Section */}
          <div className="flex flex-col items-start gap-2">
            <SkeletonBlock className="w-16 h-3" />
            <SkeletonBlock className="w-32 h-7" />
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SkeletonBlock className="w-9 h-6 rounded-md" />
              <SkeletonBlock className="w-8 h-5 rounded" />
            </div>
            <div className="flex items-center gap-1.5">
              {[0,1,2,3].map((i) => (
                <SkeletonBlock key={i} className="w-[6px] h-[6px] rounded-full" />
              ))}
              <SkeletonBlock className="w-10 h-3 rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* Pagination dots */}
      <div className="flex items-center justify-center gap-2 mt-4" dir="rtl">
        <SkeletonBlock className="w-3.5 h-1.5 rounded-full" />
        <SkeletonBlock className="w-1.5 h-1.5 rounded-full" />
        <SkeletonBlock className="w-1.5 h-1.5 rounded-full" />
      </div>
    </div>
  );
}

// ========================================
// Service Grid Skeleton (3x3)
// ========================================

export function ServiceGridSkeleton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="px-4 mt-5">
      <div className="flex items-center justify-between mb-3">
        <SkeletonBlock className="w-12 h-4" />
        <SkeletonBlock className="w-14 h-3" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center gap-2.5 py-4 px-3"
            style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF',
              borderRadius: 16,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <SkeletonBlock className="w-11 h-11 rounded-2xl" />
            <SkeletonBlock className="w-14 h-3 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ========================================
// Transaction List Skeleton
// ========================================

export function TransactionListSkeleton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="px-4 mt-5">
      <div className="flex items-center justify-between mb-3">
        <SkeletonBlock className="w-12 h-4" />
        <SkeletonBlock className="w-14 h-3" />
      </div>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: isDark ? '#1A1A1A' : '#FFFFFF',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3"
            style={{
              borderBottom: i < 4
                ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}`
                : 'none',
            }}
          >
            <SkeletonBlock className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <SkeletonBlock className="w-24 h-3.5" />
              <SkeletonBlock className="w-16 h-2.5" />
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <SkeletonBlock className="w-16 h-3.5" />
              <SkeletonBlock className="w-8 h-4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========================================
// Provider Grid Skeleton
// ========================================

export function ProviderGridSkeleton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="px-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <SkeletonBlock className="w-20 h-4" />
        <SkeletonBlock className="w-14 h-3" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3"
            style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF',
              borderRadius: 16,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            <SkeletonBlock className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex flex-col gap-1.5 flex-1">
              <SkeletonBlock className="w-16 h-3.5" />
              <SkeletonBlock className="w-10 h-2.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========================================
// Banner Skeleton
// ========================================

export function BannerSkeleton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="px-4 mt-4">
      <div
        className="rounded-2xl relative overflow-hidden"
        style={{
          height: 110,
          background: isDark ? '#1A1A1A' : '#FFFFFF',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
          borderRadius: 16,
        }}
      >
        <div className="p-4 h-full flex flex-col justify-center gap-2">
          <div className="flex items-center gap-2">
            <SkeletonBlock className="w-14 h-4 rounded-full" />
          </div>
          <SkeletonBlock className="w-48 h-4" />
          <SkeletonBlock className="w-32 h-3" />
        </div>
        {/* Dot indicators */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
          <SkeletonBlock className="w-3 h-[3px] rounded-full" />
          <SkeletonBlock className="w-1 h-[3px] rounded-full" />
          <SkeletonBlock className="w-1 h-[3px] rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ========================================
// Profile Skeleton
// ========================================

export function ProfileSkeleton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="px-4">
      <div
        className="rounded-2xl p-6"
        style={{
          background: isDark ? '#1A1A1A' : '#FFFFFF',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
        }}
      >
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <SkeletonBlock className="w-16 h-16 rounded-2xl shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <SkeletonBlock className="w-28 h-5" />
            <SkeletonBlock className="w-20 h-3" />
            <SkeletonBlock className="w-24 h-3" />
          </div>
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[0,1,2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <SkeletonBlock className="w-10 h-10 rounded-xl" />
              <SkeletonBlock className="w-12 h-3" />
              <SkeletonBlock className="w-16 h-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========================================
// Full Home Screen Skeleton
// ========================================

export function HomeScreenSkeleton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="pb-4">
      {/* Header skeleton */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between" style={{ height: 56 }}>
          <div className="flex items-center gap-3">
            <SkeletonBlock className="w-10 h-10 rounded-xl" />
            <div className="flex flex-col gap-1.5">
              <SkeletonBlock className="w-28 h-4" />
              <SkeletonBlock className="w-16 h-2.5" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SkeletonBlock className="w-10 h-10 rounded-xl" />
            <SkeletonBlock className="w-10 h-10 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Balance card skeleton */}
      <BalanceCardSkeleton />

      {/* Banner skeleton */}
      <BannerSkeleton />

      {/* Services grid skeleton */}
      <ServiceGridSkeleton />

      {/* Transactions skeleton */}
      <TransactionListSkeleton />
    </div>
  );
}

// ========================================
// Full Wallet Screen Skeleton
// ========================================

export function WalletScreenSkeleton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="pb-4">
      {/* Header skeleton */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between" style={{ height: 50 }}>
          <div className="flex flex-col gap-1.5">
            <SkeletonBlock className="w-20 h-6" />
            <SkeletonBlock className="w-36 h-3" />
          </div>
          <SkeletonBlock className="w-10 h-10 rounded-xl" />
        </div>
      </div>

      {/* Balance card skeleton */}
      <BalanceCardSkeleton />

      {/* Spending summary skeleton */}
      <div className="px-4 mt-5">
        <div
          className="rounded-2xl p-4"
          style={{
            background: isDark ? '#1A1A1A' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <SkeletonBlock className="w-4 h-4 rounded" />
            <SkeletonBlock className="w-32 h-4" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <SkeletonBlock className="w-8 h-8 rounded-lg shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <SkeletonBlock className="w-8 h-3" />
                    <SkeletonBlock className="w-16 h-3" />
                  </div>
                  <SkeletonBlock className="w-full h-2 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search bar skeleton */}
      <div className="px-4 mt-4">
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-2xl"
          style={{
            background: isDark ? '#1A1A1A' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
          }}
        >
          <SkeletonBlock className="w-5 h-5 rounded shrink-0" />
          <SkeletonBlock className="w-32 h-4" />
        </div>
      </div>

      {/* Transaction list skeleton */}
      <TransactionListSkeleton />
    </div>
  );
}
