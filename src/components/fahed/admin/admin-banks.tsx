'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ToggleLeft, ToggleRight, Edit3, Save, X, Copy, Building2 } from 'lucide-react';
import { useAdminContext } from './admin-context';
import type { BankAccount } from './admin-types';

export default function AdminBanks() {
  const {
    isDark, cardStyle, inputStyle, banks,
    handleAddBank, handleUpdateBank, handleDeleteBank, handleToggleBank
  } = useAdminContext();

  const [showAddBank, setShowAddBank] = useState(false);
  const [editingBank, setEditingBank] = useState<string | null>(null);
  const [newBank, setNewBank] = useState({ bankName: '', accountHolderName: '', accountNumber: '', color: '#5C1A1B' });

  const onAddBank = () => {
    if (!newBank.bankName || !newBank.accountNumber) return;
    handleAddBank(newBank);
    setNewBank({ bankName: '', accountHolderName: '', accountNumber: '', color: '#5C1A1B' });
    setShowAddBank(false);
  };

  const getEditingBank = (): BankAccount | undefined => {
    return banks.find(b => b.id === editingBank);
  };

  return (
    <motion.div key="banks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
      <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setShowAddBank(!showAddBank); setEditingBank(null); }}
        className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium"
        style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B', border: '1px solid rgba(92,26,27,0.2)', backdropFilter: 'blur(20px)' }}>
        <Plus size={18} strokeWidth={1.5} /><span>إضافة بنك جديد</span>
      </motion.button>

      <AnimatePresence>
        {showAddBank && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-2xl p-4 space-y-3 overflow-hidden" style={cardStyle}>
            <input type="text" placeholder="اسم البنك" value={newBank.bankName} onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            <input type="text" placeholder="اسم صاحب الحساب" value={newBank.accountHolderName} onChange={(e) => setNewBank({ ...newBank, accountHolderName: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
            <input type="text" placeholder="رقم الحساب" value={newBank.accountNumber} onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
            <div className="flex items-center gap-3">
              <label className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>اللون</label>
              <input type="color" value={newBank.color} onChange={(e) => setNewBank({ ...newBank, color: e.target.value })} className="w-10 h-8 rounded cursor-pointer" style={{ background: 'transparent' }} />
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={onAddBank} className="w-full py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#5C1A1B' }}>إضافة البنك</motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {banks.map((bank) => (
        <div key={bank.id} className="rounded-2xl p-4" style={{ ...cardStyle, borderRight: `3px solid ${bank.color}` }}>
          {editingBank === bank.id ? (
            <BankEditForm
              bank={bank}
              isDark={isDark}
              inputStyle={inputStyle}
              onSave={(updated) => { handleUpdateBank(updated); setEditingBank(null); }}
              onCancel={() => setEditingBank(null)}
            />
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${bank.color}18` }}>
                    <Building2 size={20} color={bank.color} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{bank.bankName}</p>
                    <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>{bank.accountHolderName}</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: bank.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(92,26,27,0.15)', color: bank.isActive ? '#10B981' : '#5C1A1B' }}>
                  {bank.isActive ? 'مفعّل' : 'معطّل'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl mb-3" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>رقم الحساب</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-mono font-medium" dir="ltr" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{bank.accountNumber}</p>
                  <button onClick={() => { navigator.clipboard.writeText(bank.accountNumber); }} className="text-[10px]" style={{ color: '#3B82F6' }}><Copy size={10} /></button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setEditingBank(bank.id)} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
                  <Edit3 size={12} /> تعديل
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleToggleBank(bank)} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: bank.isActive ? 'rgba(92,26,27,0.1)' : 'rgba(16,185,129,0.15)', color: bank.isActive ? '#5C1A1B' : '#10B981' }}>
                  {bank.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  <span>{bank.isActive ? 'تعطيل' : 'تفعيل'}</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleDeleteBank(bank)} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
                  <Trash2 size={12} /> حذف
                </motion.button>
              </div>
            </>
          )}
        </div>
      ))}
      {banks.length === 0 && !showAddBank && (
        <div className="flex flex-col items-center py-8"><Building2 size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد بنوك مضافة</p><p className="text-xs mt-1" style={{ color: isDark ? '#555' : '#BBB' }}>أضف بنوك لتظهر للمستخدمين في شاشة الإيداع</p></div>
      )}
    </motion.div>
  );
}

// Sub-component for editing a bank
function BankEditForm({ bank, isDark, inputStyle, onSave, onCancel }: {
  bank: BankAccount;
  isDark: boolean;
  inputStyle: { background: string; color: string };
  onSave: (bank: BankAccount) => void;
  onCancel: () => void;
}) {
  const [editData, setEditData] = useState({ ...bank });

  return (
    <div className="space-y-3">
      <input type="text" value={editData.bankName} onChange={(e) => setEditData({ ...editData, bankName: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="اسم البنك" />
      <input type="text" value={editData.accountHolderName} onChange={(e) => setEditData({ ...editData, accountHolderName: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="اسم صاحب الحساب" />
      <input type="text" value={editData.accountNumber} onChange={(e) => setEditData({ ...editData, accountNumber: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} placeholder="رقم الحساب" dir="ltr" />
      <div className="flex items-center gap-3">
        <label className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>اللون</label>
        <input type="color" value={editData.color} onChange={(e) => setEditData({ ...editData, color: e.target.value })} className="w-10 h-8 rounded cursor-pointer" style={{ background: 'transparent' }} />
      </div>
      <div className="flex gap-2">
        <motion.button whileTap={{ scale: 0.95 }} onClick={() => onSave(editData)} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1" style={{ background: '#10B981' }}>
          <Save size={14} /> حفظ
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
          <X size={14} /> إلغاء
        </motion.button>
      </div>
    </div>
  );
}
