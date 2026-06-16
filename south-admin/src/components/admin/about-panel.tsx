'use client';

import { useAdminStore } from '@/lib/store';
import {
  Info,
  Heart,
  Code,
  Shield,
  Smartphone,
  Globe,
  Database,
  Server,
  Users,
  Clock,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { APP_ICON_BASE64 } from '@/lib/app-icon';

export default function AboutPanel() {
  const { adminUser, allUsers, orders } = useAdminStore();

  const systemInfo = [
    { label: 'اسم التطبيق', value: 'محفظة الجنوب', icon: Smartphone },
    { label: 'الإصدار', value: '2.1.0', icon: Info },
    { label: 'آخر تحديث', value: new Date().toLocaleDateString('ar-SA'), icon: Clock },
    { label: 'إجمالي المستخدمين', value: allUsers.length, icon: Users },
    { label: 'إجمالي الطلبات', value: orders.length, icon: Database },
    { label: 'الخادم', value: 'Firebase', icon: Server },
    { label: 'اللغة', value: 'العربية', icon: Globe },
  ];

  return (
    <div className="space-y-6 max-w-[800px] mx-auto">
      <div>
        <h1 className="ios-large-title text-foreground">حول النظام</h1>
        <p className="text-muted-foreground text-sm mt-1">معلومات عن محفظة الجنوب</p>
      </div>

      {/* App Identity */}
      <div className="ios-card p-6 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center overflow-hidden shadow-xl shadow-purple-500/20">
          <img
            src={APP_ICON_BASE64}
            alt="محفظة الجنوب"
            className="w-14 h-14 object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
        <h2 className="text-xl font-bold text-foreground">محفظة الجنوب</h2>
        <p className="text-sm text-muted-foreground mt-1">الإدارة - الإصدار 2.1.0</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">South Wallet Admin Panel</p>
      </div>

      {/* Developer Credit */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="ios-card-elevated p-6 bg-gradient-to-br from-purple-500/5 to-purple-600/5 border border-purple-500/10"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-purple-500/10">
            <Code className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">تم التطوير بواسطة</p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">مؤسسة QTBM DEV</p>
            <p className="text-xs text-muted-foreground mt-0.5">QTBM DEV Foundation</p>
          </div>
          <Heart className="w-5 h-5 text-red-500 mr-auto" />
        </div>
      </motion.div>

      {/* System Info */}
      <div className="ios-card overflow-hidden">
        <div className="p-4 pb-2">
          <h3 className="text-sm font-semibold text-foreground">معلومات النظام</h3>
        </div>
        <div>
          {systemInfo.map((info, i) => {
            const Icon = info.icon;
            return (
              <div key={i} className="ios-list-item gap-3">
                <div className="p-1.5 rounded-lg bg-muted/30">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-sm text-foreground flex-1">{info.label}</span>
                <span className="text-sm text-muted-foreground font-medium">{info.value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Info */}
      {adminUser && (
        <div className="ios-card overflow-hidden">
          <div className="p-4 pb-2">
            <h3 className="text-sm font-semibold text-foreground">معلومات المدير</h3>
          </div>
          <div>
            <div className="ios-list-item gap-3">
              <div className="p-1.5 rounded-lg bg-muted/30">
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-foreground flex-1">الاسم</span>
              <span className="text-sm text-muted-foreground font-medium">{adminUser.displayName}</span>
            </div>
            <div className="ios-list-item gap-3">
              <div className="p-1.5 rounded-lg bg-muted/30">
                <Shield className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-foreground flex-1">الصلاحية</span>
              <span className="text-sm text-purple-500 font-medium">{adminUser.role === 'owner' ? 'المالك' : 'مدير'}</span>
            </div>
            <div className="ios-list-item gap-3">
              <div className="p-1.5 rounded-lg bg-muted/30">
                <Globe className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-foreground flex-1">البريد</span>
              <span className="text-sm text-muted-foreground font-medium" dir="ltr">{adminUser.email}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tech Stack */}
      <div className="ios-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">التقنيات المستخدمة</h3>
        <div className="flex flex-wrap gap-2">
          {['Next.js 16', 'TypeScript', 'Firebase', 'Tailwind CSS', 'Capacitor', 'Zustand', 'Framer Motion'].map(tech => (
            <span key={tech} className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-medium">
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Copyright */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} محفظة الجنوب - جميع الحقوق محفوظة
        </p>
        <p className="text-[10px] text-muted-foreground/40 mt-1">
          تم التطوير بواسطة: مؤسسة QTBM DEV
        </p>
      </div>
    </div>
  );
}
