'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Wrench,
  Save,
  AlertTriangle,
  Clock,
  Check,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { database } from '@/lib/firebase';
import { ref, get, set } from 'firebase/database';

export default function MaintenancePanel() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('نحن نقوم بتحسين النظام. سنعود قريباً!');
  const [estimatedTime, setEstimatedTime] = useState('30 دقيقة');
  const [allowAdminAccess, setAllowAdminAccess] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load current maintenance settings from Firebase on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const snapshot = await get(ref(database, 'adminSettings/maintenance'));
        if (snapshot.exists()) {
          const data = snapshot.val();
          setMaintenanceMode(data.active === true);
          setMaintenanceMessage(data.message || 'نحن نقوم بتحسين النظام. سنعود قريباً!');
          setEstimatedTime(data.estimatedTime || '30 دقيقة');
          setAllowAdminAccess(data.allowAdminAccess !== false);
        }
      } catch (error) {
        console.error('Error loading maintenance settings:', error);
      }
      setIsLoading(false);
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const maintenanceData = {
        active: maintenanceMode,
        message: maintenanceMessage,
        estimatedTime: estimatedTime,
        allowAdminAccess: allowAdminAccess,
        updatedAt: new Date().toISOString(),
        updatedBy: 'admin',
      };
      await set(ref(database, 'adminSettings/maintenance'), maintenanceData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving maintenance settings:', error);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[800px] mx-auto">
      <div>
        <h1 className="ios-large-title text-foreground">وضع الصيانة</h1>
        <p className="text-muted-foreground text-sm mt-1">إدارة وضع صيانة التطبيق - عند التفعيل يتم قفل التطبيق على جميع المستخدمين فوراً</p>
      </div>

      {/* Warning */}
      <AnimatePresence>
        {maintenanceMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20"
          >
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-500">وضع الصيانة مفعّل</p>
              <p className="text-xs text-red-400">المستخدمون لن يتمكنوا من الوصول للتطبيق حتى يتم تعطيل وضع الصيانة</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success message */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-2xl bg-green-500/10 border border-green-500/20"
          >
            <Check className="w-5 h-5 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-500">تم الحفظ بنجاح</p>
              <p className="text-xs text-green-400">{maintenanceMode ? 'وضع الصيانة مفعّل - التطبيق مقفل للمستخدمين' : 'وضع الصيانة معطّل - التطبيق متاح للجميع'}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Toggle */}
      <div className="ios-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2.5 rounded-xl', maintenanceMode ? 'bg-red-500/10' : 'bg-green-500/10')}>
              <Wrench className={cn('w-5 h-5', maintenanceMode ? 'text-red-500' : 'text-green-500')} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">وضع الصيانة</p>
              <p className="text-xs text-muted-foreground">{maintenanceMode ? 'التطبيق في وضع الصيانة - مقفل للمستخدمين' : 'التطبيق يعمل بشكل طبيعي'}</p>
            </div>
          </div>
          <div
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            className={cn('ios-toggle', maintenanceMode && 'active')}
          />
        </div>
      </div>

      {/* Settings */}
      <div className="ios-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">إعدادات الصيانة</h3>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">رسالة الصيانة</label>
          <textarea
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            className="w-full h-24 px-4 py-3 rounded-xl bg-muted/30 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 resize-none"
            placeholder="رسالة تظهر للمستخدمين أثناء الصيانة"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">الوقت المتوقع للعودة</label>
          <input
            type="text"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            className="w-full h-11 px-4 rounded-xl bg-muted/30 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            placeholder="مثال: 30 دقيقة"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">السماح بوصول المديرين أثناء الصيانة</span>
          </div>
          <div
            onClick={() => setAllowAdminAccess(!allowAdminAccess)}
            className={cn('ios-toggle', allowAdminAccess && 'active')}
          />
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className={cn(
          "w-full py-3 rounded-2xl bg-purple-500 text-white font-medium text-sm shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-transform flex items-center justify-center gap-2",
          isSaving && "opacity-70 cursor-not-allowed"
        )}
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : saveSuccess ? (
          <Check className="w-4 h-4" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        {isSaving ? 'جاري الحفظ...' : saveSuccess ? 'تم الحفظ' : 'حفظ الإعدادات'}
      </button>
    </div>
  );
}
