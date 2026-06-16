'use client';

import { motion } from 'framer-motion';
import { Home, List, ShoppingBag, User, ArrowUp } from 'lucide-react';

export type TabType = 'home' | 'services' | 'wallet' | 'account';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onFabClick: () => void;
}

const tabs: { id: TabType; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'الرئيسية', icon: Home },
  { id: 'wallet', label: 'المحفظة', icon: ShoppingBag },
  { id: 'services', label: 'القائمة', icon: List },
  { id: 'account', label: 'الحساب', icon: User },
];

export default function BottomNav({ activeTab, onTabChange, onFabClick }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-md mx-auto">
        <div className="bg-white border-t border-gray-100 px-2 pt-2 pb-6 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-around relative">
            {/* RTL order: account, services, [FAB], wallet, home */}
            <NavItem
              tab={tabs[3]}
              isActive={activeTab === tabs[3].id}
              onClick={() => onTabChange(tabs[3].id)}
            />
            <NavItem
              tab={tabs[2]}
              isActive={activeTab === tabs[2].id}
              onClick={() => onTabChange(tabs[2].id)}
            />

            {/* FAB Button - Dark color, thumb-reachable, centered */}
            <motion.button
              onClick={onFabClick}
              className="relative -mt-8 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(92,26,27,0.3)]"
              style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)' }}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
            >
              <ArrowUp className="w-6 h-6 text-white stroke-[2px]" />
              {/* Red accent ring around FAB */}
              <div className="absolute inset-0 rounded-full border-2 border-[#5C1A1B]/20" />
            </motion.button>

            <NavItem
              tab={tabs[1]}
              isActive={activeTab === tabs[1].id}
              onClick={() => onTabChange(tabs[1].id)}
            />
            <NavItem
              tab={tabs[0]}
              isActive={activeTab === tabs[0].id}
              onClick={() => onTabChange(tabs[0].id)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({
  tab,
  isActive,
  onClick,
}: {
  tab: { id: TabType; label: string; icon: typeof Home };
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors relative ${
        isActive ? 'text-[#5C1A1B]' : 'text-gray-400'
      }`}
    >
      <tab.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
      <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
      {/* Active indicator dot */}
      {isActive && (
        <motion.div
          className="absolute -top-1 w-1 h-1 bg-[#5C1A1B] rounded-full"
          layoutId="activeTab"
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
      )}
    </button>
  );
}
