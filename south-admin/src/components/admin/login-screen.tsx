'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import { useAdminStore } from '@/lib/store';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { APP_ICON_BASE64 } from '@/lib/app-icon';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setAdminUser } = useAdminStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const roleRef = ref(database, `users/${uid}/role`);
      const roleSnapshot = await get(roleRef);
      const role = roleSnapshot.val();

      if (role !== 'admin' && role !== 'owner') {
        await signOut(auth);
        setError('ليس لديك صلاحية الوصول - يجب أن تكون مدير أو مالك');
        setLoading(false);
        return;
      }

      const nameRef = ref(database, `users/${uid}`);
      const nameSnapshot = await get(nameRef);
      const userData = nameSnapshot.val() || {};

      setAdminUser({
        uid,
        email: userCredential.user.email || email,
        displayName: userData.name || userData.firstName || email.split('@')[0],
        role,
        photoURL: userData.avatar || userCredential.user.photoURL || undefined,
      });
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') setError('المستخدم غير موجود');
      else if (err.code === 'auth/wrong-password') setError('كلمة المرور غير صحيحة');
      else if (err.code === 'auth/invalid-email') setError('البريد الإلكتروني غير صالح');
      else if (err.code === 'auth/too-many-requests') setError('محاولات كثيرة جدا - حاول لاحقا');
      else if (err.code === 'auth/invalid-credential') setError('بيانات الدخول غير صحيحة');
      else setError('حدث خطأ في تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 ios-bg">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center overflow-hidden shadow-xl shadow-purple-500/20"
          >
            <img
              src={APP_ICON_BASE64}
              alt="محفظة الجنوب"
              className="w-14 h-14 object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground mb-1">محفظة الجنوب</h1>
          <p className="text-muted-foreground text-sm">لوحة تحكم المديرين</p>
        </div>

        {/* Login Card - iOS Style */}
        <div className="ios-card-elevated p-6">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 px-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all"
                required
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 px-1">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="w-full h-12 px-4 rounded-2xl bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/30 transition-all"
                  required
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 rounded-2xl bg-red-500/5 border border-red-500/15">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-red-500 text-sm">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full h-12 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/30 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 active:scale-[0.98]"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /><span>جاري تسجيل الدخول...</span></>
              ) : (
                <span>تسجيل الدخول</span>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-muted-foreground/40 text-[10px]">محفظة الجنوب - نظام الإدارة v2.1</p>
          <p className="text-muted-foreground/30 text-[9px] mt-1">تم التطوير بواسطة: مؤسسة QTBM DEV</p>
        </div>
      </motion.div>
    </div>
  );
}
