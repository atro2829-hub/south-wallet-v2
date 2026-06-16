'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, UserCheck, UserX, BadgeCheck, Image as ImageIcon } from 'lucide-react';
import { useAdminContext } from './admin-context';

export default function AdminKyc() {
  const {
    isDark, cardStyle, kycUsers, handleApproveKyc, handleRejectKyc, setViewKycPhoto
  } = useAdminContext();

  const [kycRejectReason, setKycRejectReason] = useState('');

  const onRejectKyc = async (u: typeof kycUsers[0]) => {
    await handleRejectKyc(u);
    setKycRejectReason('');
  };

  return (
    <motion.div key="kyc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <ShieldCheck size={16} color="#3B82F6" />
        <span className="text-xs" style={{ color: isDark ? '#888' : '#888' }}>طلبات التحقق: {kycUsers.length}</span>
      </div>
      {kycUsers.map((u) => (
        <div key={u.id} className="rounded-2xl p-4" style={{ ...cardStyle, borderRight: '3px solid #3B82F6' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
              <UserCheck size={18} color="#3B82F6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{u.name}</p>
              <p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>معرف: {u.userId}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {u.cardType && <div className="p-2 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}><p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>نوع الوثيقة</p><p className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{u.cardType}</p></div>}
            {u.cardNumber && <div className="p-2 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}><p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>رقم الوثيقة</p><p className="text-xs font-medium" dir="ltr" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{u.cardNumber}</p></div>}
            {u.governorate && <div className="p-2 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}><p className="text-[10px]" style={{ color: isDark ? '#666' : '#AAA' }}>المحافظة</p><p className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{u.governorate}</p></div>}
          </div>
          <div className="flex gap-2 mb-3">
            {u.idPhotoUrl && <button onClick={() => setViewKycPhoto({ type: 'id', url: u.idPhotoUrl! })} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}><ImageIcon size={12} /> صورة الوثيقة</button>}
            {u.selfieUrl && <button onClick={() => setViewKycPhoto({ type: 'selfie', url: u.selfieUrl! })} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}><ImageIcon size={12} /> الصورة الشخصية</button>}
          </div>
          <div className="flex gap-2">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleApproveKyc(u)} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: '#10B981' }}>
              <BadgeCheck size={14} /> توثيق
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => onRejectKyc(u)} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold" style={{ background: 'rgba(92,26,27,0.1)', color: '#5C1A1B' }}>
              <UserX size={14} /> رفض
            </motion.button>
          </div>
          <div className="mt-2">
            <input type="text" placeholder="سبب الرفض (اختياري)" value={kycRejectReason} onChange={e => setKycRejectReason(e.target.value)} className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', color: isDark ? '#FFF' : '#1a1a1a' }} />
          </div>
        </div>
      ))}
      {kycUsers.length === 0 && (
        <div className="flex flex-col items-center py-8"><ShieldCheck size={40} strokeWidth={1.5} color={isDark ? '#333' : '#DDD'} /><p className="text-sm mt-2" style={{ color: isDark ? '#666' : '#AAA' }}>لا توجد طلبات تحقق</p></div>
      )}
    </motion.div>
  );
}
