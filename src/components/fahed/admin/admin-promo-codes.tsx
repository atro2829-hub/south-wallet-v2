'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ToggleLeft, ToggleRight, Tag, Trash2 } from 'lucide-react';
import { useAdminContext } from './admin-context';
import { currencySymbols, generateReference } from '@/lib/utils';
import type { PromoCodeData } from './admin-types';
import { ref, set, remove } from 'firebase/database';
import { database } from '@/lib/firebase';

export default function AdminPromoCodes() {
  const {
    isDark, cardStyle, inputStyle, promoCodes,
    handleTogglePromoCode
  } = useAdminContext();

  const [showAddCode, setShowAddCode] = useState(false);
  const [newCode, setNewCode] = useState({ code: '', discount: 0, type: 'percentage' as 'percentage' | 'fixed', currency: 'YER' as 'YER' | 'SAR' | 'USD', maxUses: 100, expiresAt: '' });

  const onAddCode = () => {
    if (!newCode.code || newCode.discount <= 0) return;
    const id = generateReference();
    const promoCode: PromoCodeData = {
      id,
      code: newCode.code,
      discount: newCode.discount,
      type: newCode.type,
      currency: newCode.currency,
      maxUses: newCode.maxUses,
      usedCount: 0,
      expiresAt: newCode.expiresAt || new Date(Date.now() + 30 * 86400000).toISOString(),
      isActive: true,
    };
    try { set(ref(database, `promo-codes/${id}`), promoCode); } catch {}
    setNewCode({ code: '', discount: 0, type: 'percentage', currency: 'YER', maxUses: 100, expiresAt: '' });
    setShowAddCode(false);
  };

  const handleDeleteCode = async (code: PromoCodeData) => {
    try { remove(ref(database, `promo-codes/${code.id}`)); } catch {}
  };

  return (
    <motion.div key="codes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
      <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowAddCode(!showAddCode)}
        className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
        style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B', border: '1px solid rgba(92,26,27,0.2)', backdropFilter: 'blur(20px)' }}>
        <Plus size={18} strokeWidth={1.5} /><span>إضافة كود خصم</span>
      </motion.button>
      <AnimatePresence>
        {showAddCode && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
            <input type="text" placeholder="الكود" value={newCode.code} onChange={e => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono" style={inputStyle} dir="ltr" />
            <div className="flex gap-2">
              <input type="number" placeholder="الخصم" value={newCode.discount || ''} onChange={e => setNewCode({ ...newCode, discount: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
              <select value={newCode.type} onChange={e => setNewCode({ ...newCode, type: e.target.value as 'percentage' | 'fixed' })} className="px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                <option value="percentage">نسبة مئوية</option><option value="fixed">مبلغ ثابت</option>
              </select>
            </div>
            <div className="flex gap-2">
              <select value={newCode.currency} onChange={e => setNewCode({ ...newCode, currency: e.target.value as 'YER' | 'SAR' | 'USD' })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle}>
                <option value="YER">YER</option><option value="SAR">SAR</option><option value="USD">USD</option>
              </select>
              <input type="number" placeholder="الحد الأقصى" value={newCode.maxUses || ''} onChange={e => setNewCode({ ...newCode, maxUses: parseInt(e.target.value) || 100 })} className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
            </div>
            <input type="date" value={newCode.expiresAt} onChange={e => setNewCode({ ...newCode, expiresAt: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            <motion.button whileTap={{ scale: 0.95 }} onClick={onAddCode} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#5C1A1B' }}>إضافة الكود</motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      {promoCodes.map((c) => (
        <div key={c.id} className="rounded-2xl p-4" style={{ ...cardStyle, opacity: c.isActive ? 1 : 0.6 }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono font-bold" style={{ color: '#5C1A1B' }} dir="ltr">{c.code}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(92,26,27,0.15)', color: '#5C1A1B' }}>
                {c.type === 'percentage' ? `${c.discount}%` : `${c.discount} ${currencySymbols[c.currency]}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleTogglePromoCode(c)}>
                {c.isActive ? <ToggleRight size={22} color="#10B981" /> : <ToggleLeft size={22} color={isDark ? '#444' : '#CCC'} />}
              </button>
              <button onClick={() => handleDeleteCode(c)}>
                <Trash2 size={14} color="#5C1A1B" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{c.type === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}</span>
            <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>استخدام: {c.usedCount}/{c.maxUses}</span>
            {c.expiresAt && <span className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>ينتهي: {new Date(c.expiresAt).toLocaleDateString('ar-SA')}</span>}
          </div>
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min((c.usedCount / c.maxUses) * 100, 100)}%`, background: '#5C1A1B' }} />
          </div>
        </div>
      ))}
      {promoCodes.length === 0 && (
        <div className="flex flex-col items-center py-8"><Tag size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد أكواد خصم</p></div>
      )}
    </motion.div>
  );
}
