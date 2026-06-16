'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Plus,
  Minus,
  Users,
  DollarSign,
  Split,
  Send,
  Hash,
  Phone,
  User,
  CheckCircle2,
  Loader2,
  Equal,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { currencySymbols, currencyNames, currencyBadgeColors, generateReference } from '@/lib/utils';
import { useToast } from '@/components/fahed/toast-provider';
import { ref, set } from 'firebase/database';
import { database } from '@/lib/firebase';

type Currency = 'YER' | 'SAR' | 'USD';

interface Participant {
  id: string;
  identifier: string;
  name: string;
  amount: number;
  isFound: boolean;
}

export default function SplitScreen() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { user, setActiveScreen, addNotification } = useAppStore();
  const { showToast } = useToast();

  const [totalAmount, setTotalAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('YER');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipantInput, setNewParticipantInput] = useState('');
  const [inputMode, setInputMode] = useState<'userId' | 'phone'>('userId');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const total = parseFloat(totalAmount) || 0;
  const allocatedTotal = participants.reduce((sum, p) => sum + p.amount, 0);
  const remaining = total - allocatedTotal;
  const yourShare = total > 0 && participants.length > 0
    ? Math.max(0, total - allocatedTotal)
    : total > 0 ? total / (participants.length + 1) : 0;

  const handleAddParticipant = () => {
    if (!newParticipantInput.trim()) return;

    const id = `p-${Date.now()}`;
    const isPhone = inputMode === 'phone' || newParticipantInput.startsWith('7');

    const newParticipant: Participant = {
      id,
      identifier: isPhone ? `+967${newParticipantInput}` : newParticipantInput,
      name: isPhone ? `+967${newParticipantInput}` : `حساب ${newParticipantInput}`,
      amount: 0,
      isFound: false,
    };

    setParticipants((prev) => [...prev, newParticipant]);
    setNewParticipantInput('');
    showToast('info', 'تمت الإضافة', 'تمت إضافة الشخص إلى القائمة');
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdateAmount = (id: string, amount: string) => {
    const val = parseFloat(amount) || 0;
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, amount: val } : p))
    );
  };

  const handleDivideEqually = () => {
    if (total <= 0 || participants.length === 0) return;

    const perPerson = total / (participants.length + 1);
    setParticipants((prev) =>
      prev.map((p) => ({ ...p, amount: Math.floor(perPerson) }))
    );
    showToast('success', 'تم التقسيم', `النصيب لكل شخص: ${Math.floor(perPerson).toLocaleString('ar-SA')} ${currencySymbols[currency]}`);
  };

  const handleSendRequests = async () => {
    if (!user || total <= 0 || participants.length === 0) return;

    setIsSending(true);
    try {
      // Create request records for each participant
      for (const participant of participants) {
        if (participant.amount <= 0) continue;

        const refId = generateReference();
        const requestData = {
          id: refId,
          fromUserId: user.id,
          fromName: user.name,
          toIdentifier: participant.identifier,
          amount: participant.amount,
          currency,
          type: 'split_bill',
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        try {
          const reqRef = ref(database, `money-requests/${refId}`);
          await set(reqRef, requestData);
        } catch {
          // Continue even if Firebase fails
        }

        // Add notification
        addNotification({
          id: generateReference(),
          title: 'طلب تقسيم فاتورة',
          body: `تم إرسال طلب بمبلغ ${participant.amount.toLocaleString('ar-SA')} ${currencySymbols[currency]} إلى ${participant.name}`,
          type: 'transaction',
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      }

      setIsSent(true);
      showToast('success', 'تم الإرسال', 'تم إرسال طلبات التقسيم بنجاح');
    } catch {
      showToast('error', 'خطأ', 'حدث خطأ أثناء إرسال الطلبات');
    } finally {
      setIsSending(false);
    }
  };

  const glassStyle = {
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
  };

  if (isSent) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="flex flex-col items-center"
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ background: 'rgba(16,185,129,0.1)' }}
          >
            <CheckCircle2 size={40} strokeWidth={1.5} color="#10B981" />
          </div>
          <h2 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
            تم إرسال الطلبات!
          </h2>
          <p className="text-sm text-center mt-2 max-w-[250px]" style={{ color: isDark ? '#888' : '#AAA' }}>
            تم إرسال طلبات تقسيم الفاتورة إلى جميع المشاركين
          </p>
          <button
            onClick={() => setActiveScreen('main')}
            className="mt-6 px-8 py-3 rounded-2xl text-sm font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #5C1A1B 0%, #B30000 100%)',
              boxShadow: '0 4px 16px rgba(92,26,27,0.3)',
            }}
          >
            العودة للرئيسية
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: isDark ? '#0F0F0F' : '#F5F5F5' }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveScreen('main')}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: isDark ? '#1A1A1A' : '#F0F0F0' }}
          >
            <ArrowRight size={16} strokeWidth={1.5} color={isDark ? '#FFF' : '#666'} />
          </button>
          <h1 className="text-xl font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
            تقسيم الفاتورة
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 mt-2 pb-8 overflow-y-auto space-y-4">
        {/* Total Amount Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4"
          style={{
            ...glassStyle,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}
        >
          <label
            className="text-xs font-medium mb-2 block"
            style={{ color: isDark ? '#AAA' : '#888' }}
          >
            إجمالي الفاتورة
          </label>
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 flex-1 px-4 py-3 rounded-2xl"
              style={{
                background: isDark ? '#222' : '#F8F8F8',
                border: isDark ? '1px solid #333' : '1px solid #EEE',
              }}
            >
              <DollarSign size={18} strokeWidth={1.5} color="#5C1A1B" />
              <input
                type="number"
                placeholder="0"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="flex-1 bg-transparent outline-none text-lg font-bold"
                style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                dir="ltr"
              />
            </div>
            {/* Currency Selector */}
            <div className="flex gap-1">
              {(['YER', 'SAR', 'USD'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className="px-2 py-2 rounded-xl text-[10px] font-bold transition-all"
                  style={{
                    background: currency === c
                      ? `${currencyBadgeColors[c]}20`
                      : isDark ? '#222' : '#F8F8F8',
                    border: currency === c
                      ? `1px solid ${currencyBadgeColors[c]}`
                      : isDark ? '1px solid #333' : '1px solid #EEE',
                    color: currency === c ? currencyBadgeColors[c] : isDark ? '#888' : '#AAA',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Add Participant */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-4"
          style={glassStyle}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium" style={{ color: isDark ? '#AAA' : '#888' }}>
              إضافة شخص
            </span>
            {/* Mode Toggle */}
            <div
              className="flex rounded-xl overflow-hidden"
              style={{ background: isDark ? '#222' : '#F0F0F0' }}
            >
              <button
                onClick={() => setInputMode('userId')}
                className="px-3 py-1.5 text-[10px] font-medium transition-all"
                style={{
                  background: inputMode === 'userId' ? '#5C1A1B' : 'transparent',
                  color: inputMode === 'userId' ? '#FFF' : isDark ? '#888' : '#AAA',
                }}
              >
                <Hash size={10} className="inline ml-1" />
                رقم
              </button>
              <button
                onClick={() => setInputMode('phone')}
                className="px-3 py-1.5 text-[10px] font-medium transition-all"
                style={{
                  background: inputMode === 'phone' ? '#5C1A1B' : 'transparent',
                  color: inputMode === 'phone' ? '#FFF' : isDark ? '#888' : '#AAA',
                }}
              >
                <Phone size={10} className="inline ml-1" />
                هاتف
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <div
              className="flex items-center gap-2 flex-1 px-4 py-3 rounded-2xl"
              style={{
                background: isDark ? '#222' : '#F8F8F8',
                border: isDark ? '1px solid #333' : '1px solid #EEE',
              }}
            >
              {inputMode === 'userId' ? (
                <Hash size={18} strokeWidth={1.5} color="#5C1A1B" />
              ) : (
                <Phone size={18} strokeWidth={1.5} color="#5C1A1B" />
              )}
              <input
                type="tel"
                placeholder={inputMode === 'userId' ? 'رقم الحساب' : 'رقم الهاتف'}
                value={newParticipantInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setNewParticipantInput(inputMode === 'userId' ? val.slice(0, 6) : val.slice(0, 9));
                }}
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                dir="ltr"
              />
            </div>
            <button
              onClick={handleAddParticipant}
              disabled={!newParticipantInput.trim()}
              className="w-12 rounded-2xl flex items-center justify-center text-white disabled:opacity-40"
              style={{ background: '#5C1A1B' }}
            >
              <Plus size={20} strokeWidth={1.5} />
            </button>
          </div>
        </motion.div>

        {/* Participants List */}
        {participants.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {/* Equal Split Button */}
            <button
              onClick={handleDivideEqually}
              disabled={total <= 0}
              className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-40"
              style={{
                background: 'rgba(92,26,27,0.08)',
                color: '#5C1A1B',
                border: '1px solid rgba(92,26,27,0.2)',
              }}
            >
              <Equal size={16} strokeWidth={1.5} />
              <span>يقسم بالتساوي</span>
            </button>

            <AnimatePresence>
              {participants.map((participant, index) => (
                <motion.div
                  key={participant.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.03 }}
                  className="rounded-2xl p-4"
                  style={glassStyle}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: isDark ? '#222' : '#F0F0F0' }}
                    >
                      <User size={18} strokeWidth={1.5} color={isDark ? '#888' : '#AAA'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                      >
                        {participant.name}
                      </p>
                      <p
                        className="text-[10px] truncate"
                        style={{ color: isDark ? '#666' : '#CCC' }}
                        dir="ltr"
                      >
                        {participant.identifier}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className="flex items-center gap-1 px-3 py-2 rounded-xl"
                        style={{
                          background: isDark ? '#222' : '#F8F8F8',
                          border: isDark ? '1px solid #333' : '1px solid #EEE',
                        }}
                      >
                        <input
                          type="number"
                          placeholder="0"
                          value={participant.amount || ''}
                          onChange={(e) => handleUpdateAmount(participant.id, e.target.value)}
                          className="w-16 bg-transparent outline-none text-sm text-left font-medium"
                          style={{ color: isDark ? '#FFF' : '#1a1a1a' }}
                          dir="ltr"
                        />
                        <span className="text-[10px]" style={{ color: isDark ? '#888' : '#AAA' }}>
                          {currencySymbols[currency]}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveParticipant(participant.id)}
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(92,26,27,0.1)' }}
                      >
                        <Minus size={14} strokeWidth={1.5} color="#5C1A1B" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Summary */}
        {total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-4"
            style={{
              ...glassStyle,
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Split size={16} strokeWidth={1.5} color="#5C1A1B" />
              <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                ملخص التقسيم
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>إجمالي الفاتورة</span>
                <span className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>
                  {total.toLocaleString('ar-SA')} {currencySymbols[currency]}
                </span>
              </div>

              {participants.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: isDark ? '#888' : '#AAA' }}>حصة الآخرين</span>
                  <span className="text-sm font-medium" style={{ color: '#5C1A1B' }}>
                    {allocatedTotal.toLocaleString('ar-SA')} {currencySymbols[currency]}
                  </span>
                </div>
              )}

              <div className="h-px" style={{ background: isDark ? '#333' : '#EEE' }} />

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: isDark ? '#AAA' : '#888' }}>حصتك</span>
                <span
                  className="text-lg font-bold"
                  style={{ color: participants.length > 0 ? '#10B981' : '#5C1A1B' }}
                >
                  {participants.length > 0
                    ? Math.max(0, remaining).toLocaleString('ar-SA')
                    : total.toLocaleString('ar-SA')
                  } {currencySymbols[currency]}
                </span>
              </div>

              {participants.length > 0 && remaining < 0 && (
                <p className="text-[10px] text-center" style={{ color: '#5C1A1B' }}>
                  المبلغ المخصص يتجاوز الإجمالي
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Send Requests Button */}
        {participants.length > 0 && total > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleSendRequests}
            disabled={isSending}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-sm transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #5C1A1B 0%, #B30000 100%)',
              boxShadow: '0 4px 16px rgba(92,26,27,0.3)',
            }}
          >
            {isSending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Send size={18} strokeWidth={1.5} />
                <span>إرسال طلبات ({participants.length})</span>
              </>
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
}
