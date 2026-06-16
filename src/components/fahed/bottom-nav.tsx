'use client';

import { useTheme } from 'next-themes';
import { Home, LayoutGrid, Wallet, User, Plus, ClipboardList, QrCode, Heart } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { motion } from 'framer-motion';

type TabType = 'home' | 'services' | 'wallet' | 'account';

// Icon mapping from Firebase config string keys to lucide-react components
const iconMap: Record<string, any> = {
  home: Home,
  services: LayoutGrid,
  wallet: Wallet,
  account: User,
  orders: ClipboardList,
  qr: QrCode,
  favorites: Heart,
};

// Default tabs
const defaultTabs: { id: TabType; label: string; icon: any; visible: boolean }[] = [
  { id: 'home', label: 'الرئيسية', icon: Home, visible: true },
  { id: 'services', label: 'الخدمات', icon: LayoutGrid, visible: true },
  { id: 'wallet', label: 'المحفظة', icon: Wallet, visible: true },
  { id: 'account', label: 'حسابي', icon: User, visible: true },
];

export default function BottomNav() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { activeTab, setActiveTab, setDrawerOpen, featureFlags, fbBottomNav } = useAppStore();

  // Build tabs from Firebase bottomNav config, falling back to defaults
  const tabs = defaultTabs.filter(tab => {
    // Check Firebase visibility config
    const fbConfig = fbBottomNav?.[tab.id];
    if (fbConfig) {
      if (fbConfig.visible === false) return false;
    }
    // Check feature flags
    if (tab.id === 'services' && !featureFlags.servicesEnabled) return false;
    return true;
  }).map(tab => {
    // Apply custom label and icon from Firebase if available
    const fbConfig = fbBottomNav?.[tab.id];
    return {
      ...tab,
      label: fbConfig?.label || tab.label,
      icon: (fbConfig?.icon && iconMap[fbConfig.icon]) || tab.icon,
    };
  });

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40"
      style={{
        background: isDark ? '#0F0F0F' : '#FFFFFF',
        borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
        boxShadow: isDark
          ? '0 -2px 10px rgba(0,0,0,0.3)'
          : '0 -2px 10px rgba(0,0,0,0.04)',
      }}
    >
      <div
        className="flex items-end justify-around px-1 pt-1 safe-bottom relative"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)', height: 68 }}
      >
        {/* Left tabs */}
        {tabs.slice(0, 2).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[52px] relative"
            >
              <motion.div
                animate={{ scale: isActive ? 1.08 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2 : 1.5}
                  style={{ color: isActive ? '#5C1A1B' : isDark ? '#555' : '#AAAAAA' }}
                />
              </motion.div>
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? '#5C1A1B' : isDark ? '#555' : '#AAAAAA' }}
              >
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="navDot1"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: '#5C1A1B' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}

        {/* Center FAB */}
        <div className="flex items-center justify-center -mt-7 mx-1">
          <motion.button
            onClick={() => setDrawerOpen(true)}
            className="relative flex items-center justify-center"
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              background: isDark
                ? 'linear-gradient(145deg, #3D0F10 0%, #5C1A1B 100%)'
                : 'linear-gradient(145deg, #5C1A1B 0%, #3D0F10 100%)',
              boxShadow: '0 4px 16px rgba(92,26,27,0.35), 0 0 0 3px rgba(92,26,27,0.08)',
            }}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            <Plus size={26} strokeWidth={2.5} color="#FFFFFF" />
          </motion.button>
        </div>

        {/* Right tabs */}
        {tabs.slice(2, 4).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[52px] relative"
            >
              <motion.div
                animate={{ scale: isActive ? 1.08 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2 : 1.5}
                  style={{ color: isActive ? '#5C1A1B' : isDark ? '#555' : '#AAAAAA' }}
                />
              </motion.div>
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? '#5C1A1B' : isDark ? '#555' : '#AAAAAA' }}
              >
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="navDot2"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: '#5C1A1B' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
