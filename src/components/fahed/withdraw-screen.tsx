'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ref, push, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useStore } from '@/lib/store';
import { formatBalance, currencyNames } from '@/lib/utils';
import { ArrowRight, ArrowUpFromLine, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function WithdrawScreen() {
  const { user, navigateBack } = useStore();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [destination, setDestination] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }
    const balance = user.balances?.[currency as keyof typeof user.balances] || 0;
    if (withdrawAmount > balance) {
      toast.error('رصيدك غير كافي');
      return;
    }
    setSubmitting(true);
    try {
      const orderRef = push(ref(database, `orders/${user.id}`));
      await set(orderRef, {
        type: 'withdraw',
        amount: withdrawAmount,
        currency,
        destination,
        status: 'pending',
        createdAt: new Date().toISOString(),
        userId: user.id,
      });
      toast.success('تم إرسال طلب السحب بنجاح');
      setAmount('');
      setDestination('');
    } catch (error) {
      console.error('Withdraw error:', error);
      toast.error('حدث خطأ في إرسال الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-navy-gradient px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={navigateBack} className="p-2 glass rounded-xl">
            <ArrowRight className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-white text-lg font-bold">سحب</h1>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="glass-card rounded-2xl p-6">
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-2 block">العملة</label>
            <div className="flex gap-2">
              {['USD', 'YER', 'SAR'].map((cur) => (
                <button
                  key={cur}
                  onClick={() => setCurrency(cur)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    currency === cur
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-2 block">المبلغ</label>
            <div className="relative">
              <input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 bg-muted rounded-xl text-lg font-bold border-none focus:ring-2 focus:ring-primary/30"
                dir="ltr"
              />
              <span className="absolute left-4 top-3.5 text-muted-foreground text-sm">{currency}</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-2 block">عنوان الاستلام</label>
            <input
              type="text"
              placeholder="عنوان المحفظة أو معرف المستلم"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-4 py-3 bg-muted rounded-xl text-sm border-none focus:ring-2 focus:ring-primary/30"
              dir="ltr"
            />
          </div>

          <div className="mb-6 bg-muted/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">
              الرصيد المتاح: {formatBalance(user?.balances?.[currency as keyof typeof user.balances] || 0, currency)}
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold disabled:opacity-50"
          >
            {submitting ? 'جاري الإرسال...' : 'إرسال طلب السحب'}
          </button>
        </div>
      </div>
    </div>
  );
}
