'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Lock, Unlock, DollarSign, Users } from 'lucide-react';
import { useAdminContext } from './admin-context';
import { currencySymbols, currencyBadgeColors, formatNumber } from '@/lib/utils';

export default function AdminUsers() {
  const {
    isDark, cardStyle, inputStyle, kycStatusStyle, firebaseUsers,
    handleToggleBlock, handleBalanceAdjust
  } = useAdminContext();

  const [userSearch, setUserSearch] = useState('');
  const [balanceAdjustUser, setBalanceAdjustUser] = useState<string | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceCurrency, setBalanceCurrency] = useState<'YER' | 'SAR' | 'USD'>('YER');
  const [balanceAction, setBalanceAction] = useState<'add' | 'subtract'>('add');
  const [adjustLoading, setAdjustLoading] = useState(false);

  const filteredUsers = firebaseUsers.filter(u => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q) || u.userId?.includes(q);
  });

  const onBalanceAdjust = async (u: typeof firebaseUsers[0]) => {
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount <= 0) return;
    setAdjustLoading(true);
    await handleBalanceAdjust(u, balanceAction, amount, balanceCurrency);
    setAdjustLoading(false);
    setBalanceAdjustUser(null);
    setBalanceAmount('');
  };

  return (
    <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs" style={{ color: isDark ? '#888' : '#888' }}>إجمالي المستخدمين: {firebaseUsers.length}</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={cardStyle}>
        <Search size={16} color={isDark ? '#555' : '#AAA'} />
        <input type="text" placeholder="ابحث بالاسم، البريد، الهاتف..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="flex-1 bg-transparent outline-none text-sm" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} />
      </div>
      {filteredUsers.map((u) => {
        const kyc = kycStatusStyle[u.kycStatus] || kycStatusStyle.pending;
        return (
          <div key={u.id} className="rounded-2xl p-4" style={{
            ...cardStyle,
            borderRight: u.isBlocked ? '3px solid #5C1A1B' : undefined,
          }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(92,26,27,0.1)' }}>
                  <span className="font-bold text-sm" style={{ color: '#5C1A1B' }}>{u.name?.charAt(0) || '?'}</span>
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{u.name || 'بدون اسم'}</p>
                  <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }} dir="ltr">{u.email}</p>
                  <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{u.phone}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: isDark ? '#AAA' : '#888' }} dir="ltr">{u.userId}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: kyc.bg, color: kyc.color }}>{kyc.label}</span>
                {u.isBlocked && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(92,26,27,0.15)', color: '#5C1A1B' }}>محظور</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              {(['YER', 'SAR', 'USD'] as const).map(cur => (
                <div key={cur} className="flex-1 p-2 rounded-xl text-center" style={{ background: `${currencyBadgeColors[cur]}12` }}>
                  <p className="text-[10px]" style={{ color: currencyBadgeColors[cur] }}>{currencySymbols[cur]}</p>
                  <p className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{formatNumber(u[`balance${cur}`] || 0)}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleToggleBlock(u)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium"
                style={{ background: u.isBlocked ? 'rgba(16,185,129,0.15)' : 'rgba(92,26,27,0.1)', color: u.isBlocked ? '#10B981' : '#5C1A1B' }}>
                {u.isBlocked ? <Unlock size={12} /> : <Lock size={12} />}
                <span>{u.isBlocked ? 'إلغاء الحظر' : 'حظر'}</span>
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setBalanceAdjustUser(balanceAdjustUser === u.id ? null : u.id)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium"
                style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
                <DollarSign size={12} /><span>تعديل الرصيد</span>
              </motion.button>
            </div>
            <AnimatePresence>
              {balanceAdjustUser === u.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3">
                  <div className="p-3 rounded-xl space-y-2" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                    <p className="text-[10px] font-medium" style={{ color: isDark ? '#AAA' : '#888' }}>
                      الرصيد الحالي: {formatNumber(u[`balance${balanceCurrency}`] || 0)} {currencySymbols[balanceCurrency]}
                    </p>
                    <div className="flex items-center gap-2">
                      <select value={balanceAction} onChange={e => setBalanceAction(e.target.value as 'add' | 'subtract')} className="px-2 py-1.5 rounded-lg text-xs outline-none" style={inputStyle}>
                        <option value="add">إضافة</option><option value="subtract">خصم</option>
                      </select>
                      <input type="number" placeholder="المبلغ" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none" style={inputStyle} dir="ltr" />
                      <select value={balanceCurrency} onChange={e => setBalanceCurrency(e.target.value as 'YER' | 'SAR' | 'USD')} className="px-2 py-1.5 rounded-lg text-xs outline-none" style={inputStyle}>
                        <option value="YER">YER</option><option value="SAR">SAR</option><option value="USD">USD</option>
                      </select>
                    </div>
                    {balanceAmount && parseFloat(balanceAmount) > 0 && (
                      <p className="text-[10px]" style={{ color: isDark ? '#888' : '#888' }}>
                        الرصيد بعد التعديل: {formatNumber(
                          balanceAction === 'add'
                            ? (u[`balance${balanceCurrency}`] || 0) + parseFloat(balanceAmount)
                            : Math.max(0, (u[`balance${balanceCurrency}`] || 0) - parseFloat(balanceAmount))
                        )} {currencySymbols[balanceCurrency]}
                      </p>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onBalanceAdjust(u)}
                      disabled={adjustLoading}
                      className="w-full px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: '#5C1A1B' }}
                    >
                      {adjustLoading ? 'جاري التنفيذ...' : 'تطبيق'}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      {filteredUsers.length === 0 && (
        <div className="flex flex-col items-center py-8"><Users size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا يوجد مستخدمون</p></div>
      )}
    </motion.div>
  );
}
