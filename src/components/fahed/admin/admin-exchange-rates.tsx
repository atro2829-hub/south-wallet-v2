'use client';

import { motion } from 'framer-motion';
import { RefreshCw, ArrowLeftRight, Save, CheckCircle2, Eye, Percent, Zap } from 'lucide-react';
import { useAdminContext } from './admin-context';
import { currencySymbols, currencyBadgeColors, formatNumber } from '@/lib/utils';
import { set, ref } from 'firebase/database';
import { database } from '@/lib/firebase';

export default function AdminExchangeRates() {
  const {
    isDark, cardStyle, inputStyle, adminExchangeRates, setAdminExchangeRates, ratesSaved,
    handleSaveExchangeRates
  } = useAdminContext();

  const rates = adminExchangeRates;

  // Auto-sync: When USDtoYER or SARtoYER changes, auto-calculate the reverse rates
  const handleRateChange = (key: string, value: number) => {
    const updated = { ...rates, [key]: value };

    // Auto-calculate reverse rates for consistency
    if (key === 'USDtoYER' && value > 0) {
      updated.YERtoUSD = 1 / value;
      updated.USDtoSAR = value / (updated.SARtoYER || 410);
      updated.SARtoUSD = (updated.SARtoYER || 410) > 0 ? updated.SARtoYER / value : 0;
    }
    if (key === 'SARtoYER' && value > 0) {
      updated.YERtoSAR = 1 / value;
      updated.SARtoUSD = value / (updated.USDtoYER || 1550);
      updated.USDtoSAR = (updated.USDtoYER || 1550) / value;
    }

    setAdminExchangeRates(updated);
  };

  const onSave = () => {
    handleSaveExchangeRates();
    // Also update the legacy exchange rates path for compatibility
    try {
      set(ref(database, 'settings/exchangeRates'), {
        YER: 1,
        SAR: rates.SARtoYER,
        USD: rates.USDtoYER,
        commission: rates.commission,
      });
    } catch {}
  };

  return (
    <motion.div key="exchangeRates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
      {/* Quick set primary rates */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} color="#5C1A1B" />
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الأسعار الأساسية</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>تعديل هذين وسيتم حساب الباقي تلقائياً</span>
        </div>
        <div className="space-y-3">
          <div className="p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${currencyBadgeColors.USD}15`, color: currencyBadgeColors.USD }}>{currencySymbols.USD}</span>
              <ArrowLeftRight size={10} color={isDark ? '#666' : '#AAA'} />
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${currencyBadgeColors.YER}15`, color: currencyBadgeColors.YER }}>{currencySymbols.YER}</span>
              <span className="text-[10px] mr-auto" style={{ color: isDark ? '#666' : '#AAA' }}>دولار إلى ريال يمني</span>
            </div>
            <input type="number" step="1" value={rates.USDtoYER} onChange={e => handleRateChange('USDtoYER', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-bold" style={inputStyle} dir="ltr" />
            <p className="text-[9px] mt-1" style={{ color: isDark ? '#555' : '#AAA' }}>القيمة الافتراضية: 1550</p>
          </div>
          <div className="p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${currencyBadgeColors.SAR}15`, color: currencyBadgeColors.SAR }}>{currencySymbols.SAR}</span>
              <ArrowLeftRight size={10} color={isDark ? '#666' : '#AAA'} />
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${currencyBadgeColors.YER}15`, color: currencyBadgeColors.YER }}>{currencySymbols.YER}</span>
              <span className="text-[10px] mr-auto" style={{ color: isDark ? '#666' : '#AAA' }}>ريال سعودي إلى ريال يمني</span>
            </div>
            <input type="number" step="1" value={rates.SARtoYER} onChange={e => handleRateChange('SARtoYER', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-bold" style={inputStyle} dir="ltr" />
            <p className="text-[9px] mt-1" style={{ color: isDark ? '#555' : '#AAA' }}>القيمة الافتراضية: 410</p>
          </div>
        </div>
      </div>

      {/* All rates (auto-calculated) */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw size={16} color="#5C1A1B" />
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>جميع أسعار الصرف</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>محسوبة تلقائياً</span>
        </div>
        <div className="space-y-3">
          {[
            { key: 'YERtoSAR' as const, label: 'ريال يمني إلى ريال سعودي', from: 'YER', to: 'SAR' },
            { key: 'YERtoUSD' as const, label: 'ريال يمني إلى دولار', from: 'YER', to: 'USD' },
            { key: 'SARtoUSD' as const, label: 'ريال سعودي إلى دولار', from: 'SAR', to: 'USD' },
            { key: 'USDtoSAR' as const, label: 'دولار إلى ريال سعودي', from: 'USD', to: 'SAR' },
          ].map((rate) => (
            <div key={rate.key} className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${currencyBadgeColors[rate.from]}15`, color: currencyBadgeColors[rate.from] }}>{currencySymbols[rate.from]}</span>
                <ArrowLeftRight size={10} color={isDark ? '#666' : '#AAA'} />
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${currencyBadgeColors[rate.to]}15`, color: currencyBadgeColors[rate.to] }}>{currencySymbols[rate.to]}</span>
              </div>
              <input type="number" step="0.0001" value={rates[rate.key]} onChange={e => setAdminExchangeRates({ ...rates, [rate.key]: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
            </div>
          ))}
        </div>
      </div>

      {/* Commission */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <Percent size={16} color="#5C1A1B" />
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>نسبة العمولة على التحويلات</h3>
        </div>
        <div className="flex items-center gap-3">
          <input type="number" step="0.1" value={rates.commission} onChange={e => setAdminExchangeRates({ ...rates, commission: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
          <span className="text-sm font-bold" style={{ color: isDark ? '#AAA' : '#888' }}>%</span>
        </div>
        <p className="text-[9px] mt-2" style={{ color: isDark ? '#555' : '#AAA' }}>العمولة تُخصم من المبلغ المحول تلقائياً</p>
      </div>

      {/* Save button */}
      <motion.button whileTap={{ scale: 0.95 }} onClick={onSave}
        className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-white"
        style={{ background: '#5C1A1B' }}>
        {ratesSaved ? <><CheckCircle2 size={18} /> تم الحفظ</> : <><Save size={18} /> حفظ أسعار الصرف والعمولة</>}
      </motion.button>

      {/* Live Preview */}
      <div className="rounded-2xl p-4" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <Eye size={16} color="#5C1A1B" />
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>معاينة مباشرة</h3>
        </div>
        <div className="space-y-2">
          {[
            { amount: 1000, from: 'YER', to: 'SAR', rate: rates.YERtoSAR },
            { amount: 1000, from: 'YER', to: 'USD', rate: rates.YERtoUSD },
            { amount: 100, from: 'SAR', to: 'YER', rate: rates.SARtoYER },
            { amount: 100, from: 'USD', to: 'YER', rate: rates.USDtoYER },
          ].map((preview, i) => {
            const result = preview.amount * preview.rate;
            const commission = result * (rates.commission / 100);
            const afterCommission = result - commission;
            return (
              <div key={i} className="p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{formatNumber(preview.amount)} {currencySymbols[preview.from as keyof typeof currencySymbols]}</span>
                  <ArrowLeftRight size={12} color={isDark ? '#666' : '#AAA'} />
                  <span className="text-xs font-bold" style={{ color: '#5C1A1B' }}>{formatNumber(Math.round(afterCommission * 100) / 100)} {currencySymbols[preview.to as keyof typeof currencySymbols]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px]" style={{ color: isDark ? '#555' : '#AAA' }}>السعر: {preview.rate}</span>
                  <span className="text-[9px]" style={{ color: isDark ? '#555' : '#AAA' }}>العمولة ({rates.commission}%): -{formatNumber(Math.round(commission * 100) / 100)} {currencySymbols[preview.to as keyof typeof currencySymbols]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
