'use client';

import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  Phone,
  Signal,
  Wifi,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

// Jaib-style charging companies with brand colors
const chargingCompanies = [
  { id: 'yemen-mobile', name: 'يمن موبايل', nameEn: 'Yemen Mobile', color: '#5C1A1B', bgColor: '#5C1A1B', letter: 'YM' },
  { id: 'yo', name: 'يو', nameEn: 'YO', color: '#FF6B00', bgColor: '#FF6B00', letter: 'YO' },
  { id: 'sabafon', name: 'سبأفون', nameEn: 'Sabafon', color: '#2563EB', bgColor: '#2563EB', letter: 'S' },
  { id: 'y', name: 'واي', nameEn: 'Y', color: '#059669', bgColor: '#059669', letter: 'Y' },
  { id: 'yemen-net', name: 'يمن نت', nameEn: 'Yemen Net', color: '#8B5CF6', bgColor: '#8B5CF6', letter: 'YN' },
  { id: 'ytg', name: 'واي تي جي', nameEn: 'YTG', color: '#7C3AED', bgColor: '#7C3AED', letter: 'YT' },
];

export default function ChargingCompaniesScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { setActiveScreen, setSelectedProvider, setOrderOpen, providers } = useAppStore();

  const handleCompanyClick = (companyId: string) => {
    const provider = providers.find(p => p.id === companyId);
    if (provider) {
      setSelectedProvider(provider);
      setOrderOpen(true);
    }
  };

  return (
    <div className="min-h-screen pb-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pt-4 pb-3"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const prev = useAppStore.getState().previousScreen;
              useAppStore.getState().setActiveScreen(prev || '');
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
          >
            <ChevronLeft size={20} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>شركات الشحن</h1>
        </div>
      </motion.div>

      {/* Companies List */}
      <div className="px-4 space-y-2">
        {chargingCompanies.map((company, index) => (
          <motion.button
            key={company.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * index }}
            onClick={() => handleCompanyClick(company.id)}
            className="w-full flex items-center gap-4 p-4 rounded-2xl card-press"
            style={{
              background: isDark ? '#1A1A1A' : '#FFFFFF',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}`,
            }}
          >
            {/* Company Logo/Icon */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: company.bgColor }}
            >
              <span className="text-sm font-bold text-white">{company.letter}</span>
            </div>

            {/* Company Name */}
            <div className="flex-1 text-right">
              <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                {company.name}
              </h3>
              <p className="text-[11px] mt-0.5" style={{ color: isDark ? '#666' : '#AAA' }}>
                {company.nameEn}
              </p>
            </div>

            {/* Arrow */}
            <ChevronLeft size={18} strokeWidth={1.5} color={isDark ? '#444' : '#CCC'} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
