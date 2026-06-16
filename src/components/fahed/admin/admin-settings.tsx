'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, AlertTriangle, Clock, Bell, Globe, Percent, Send, FileText,
  Users, ChevronDown, Trash2, Mail, RefreshCw, Eye, Save, CheckCircle2,
  Palette, Wrench, Phone, MessageCircle, ExternalLink, Scale, Lock
} from 'lucide-react';
import { useAdminContext } from './admin-context';
import { currencyBadgeColors, currencyNames, timeAgo, formatNumber } from '@/lib/utils';
import { getRoleDisplayInfo, adminRoles, type UserRole } from '@/lib/permissions';
import { database } from '@/lib/firebase';
import { ref, update, get, onValue } from 'firebase/database';
import { fetchEmailQueue, type EmailQueueEntry, emailTypeLabels, deleteEmailFromQueue, markEmailSent } from '@/lib/email-notifications';

export default function AdminSettings() {
  const {
    isDark, cardStyle, inputStyle, user, firebaseUsers, auditLog,
    handleSaveRates, handleSendBulkNotif, handleSaveAppSettings, appSettings, setAppSettings, settingsSaved
  } = useAdminContext();

  const [bulkNotif, setBulkNotif] = useState({ title: '', body: '' });

  // Email queue state
  const [emailQueue, setEmailQueue] = useState<EmailQueueEntry[]>([]);
  const [showEmailQueue, setShowEmailQueue] = useState(false);

  // Listen to email queue
  useEffect(() => {
    const emailRef = ref(database, 'emailQueue');
    const unsubscribe = onValue(emailRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: EmailQueueEntry[] = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          to: val.to || '',
          userName: val.userName || '',
          subject: val.subject || '',
          body: val.body || '',
          templateType: val.templateType || 'security_alert',
          status: val.status || 'queued',
          createdAt: val.createdAt || '',
          sentAt: val.sentAt,
          error: val.error,
        }));
        setEmailQueue(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } else {
        setEmailQueue([]);
      }
    });
    return () => {};
  }, []);

  // Role management state
  const [showRoleManagement, setShowRoleManagement] = useState(false);
  const [adminUsers, setAdminUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [roleLoading, setRoleLoading] = useState(false);

  const userRole = (user?.role || 'user') as UserRole;
  const roleInfo = getRoleDisplayInfo(userRole);
  const isSuperAdmin = userRole === 'super_admin';

  const loadAdminUsers = async () => {
    setRoleLoading(true);
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const admins = Object.entries(data)
          .filter(([_key, val]: [string, any]) =>
            val.role === 'admin' || val.role === 'moderator' || val.role === 'super_admin'
          )
          .map(([key, val]: [string, any]) => ({
            id: key,
            name: val.name || 'بدون اسم',
            email: val.email || '',
            role: val.role || 'user',
          }));
        setAdminUsers(admins);
      }
    } catch (error) {
      console.error('Error loading admin users:', error);
    }
    setRoleLoading(false);
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await update(ref(database, `users/${userId}`), { role: newRole });
      setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error('Error changing role:', error);
    }
  };

  const handleRevokeAdmin = async (userId: string) => {
    try {
      await update(ref(database, `users/${userId}`), { role: 'user' });
      setAdminUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error revoking admin:', error);
    }
  };

  const onSendBulkNotif = async () => {
    await handleSendBulkNotif(bulkNotif.title, bulkNotif.body);
    setBulkNotif({ title: '', body: '' });
  };

  return (
    <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
      {/* Admin info */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center glow-red" style={{ background: 'rgba(92,26,27,0.15)' }}>
            <ShieldCheck size={24} strokeWidth={1.5} color="#5C1A1B" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>مدير النظام</p>
            <p className="text-xs" style={{ color: isDark ? '#666' : '#AAA' }} dir="ltr">{user?.email}</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}>
            <span className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>الدور</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: `${roleInfo.color}15`, color: roleInfo.color }}>{roleInfo.label}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>رقم الحساب</span>
            <span className="text-xs font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }} dir="ltr">{user?.userId}</span>
          </div>
        </div>
      </div>

      {/* ===== App Configuration ===== */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <Palette size={16} color="#5C1A1B" />
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>إعدادات التطبيق</h3>
        </div>
        <div className="space-y-3">
          {/* App name */}
          <div>
            <label className="text-xs mb-1 block" style={{ color: isDark ? '#AAA' : '#888' }}>اسم التطبيق</label>
            <input type="text" value={appSettings.appName} onChange={e => setAppSettings({ ...appSettings, appName: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          </div>
          {/* Primary color */}
          <div className="flex items-center gap-3">
            <label className="text-xs" style={{ color: isDark ? '#AAA' : '#888' }}>اللون الرئيسي</label>
            <input type="color" value={appSettings.primaryColor} onChange={e => setAppSettings({ ...appSettings, primaryColor: e.target.value })} className="w-10 h-8 rounded cursor-pointer" style={{ background: 'transparent' }} />
            <span className="text-xs font-mono" style={{ color: isDark ? '#CCC' : '#666' }} dir="ltr">{appSettings.primaryColor}</span>
          </div>
          {/* Maintenance mode */}
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
            <div className="flex items-center gap-2">
              <Wrench size={14} color={appSettings.maintenanceMode ? '#5C1A1B' : '#10B981'} />
              <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>وضع الصيانة</span>
            </div>
            <button onClick={() => setAppSettings({ ...appSettings, maintenanceMode: !appSettings.maintenanceMode })} className="relative w-10 h-6 rounded-full transition-colors" style={{ background: appSettings.maintenanceMode ? '#5C1A1B' : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }}>
              <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: appSettings.maintenanceMode ? '20px' : '4px' }} />
            </button>
          </div>
          {appSettings.maintenanceMode && (
            <div className="p-3 rounded-xl" style={{ background: 'rgba(92,26,27,0.08)', border: '1px solid rgba(92,26,27,0.2)' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} color="#5C1A1B" />
                <span className="text-xs font-bold" style={{ color: '#5C1A1B' }}>وضع الصيانة مفعّل - التطبيق غير متاح للمستخدمين</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Support & Contact ===== */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <Phone size={16} color="#5C1A1B" />
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>معلومات الدعم والتواصل</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: isDark ? '#AAA' : '#888' }}>هاتف الدعم</label>
            <input type="tel" value={appSettings.supportPhone} onChange={e => setAppSettings({ ...appSettings, supportPhone: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: isDark ? '#AAA' : '#888' }}>بريد الدعم</label>
            <input type="email" value={appSettings.supportEmail} onChange={e => setAppSettings({ ...appSettings, supportEmail: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: isDark ? '#AAA' : '#888' }}>واتساب الدعم</label>
            <input type="tel" value={appSettings.supportWhatsApp} onChange={e => setAppSettings({ ...appSettings, supportWhatsApp: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
          </div>
        </div>
      </div>

      {/* ===== Social Media Links ===== */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <ExternalLink size={16} color="#5C1A1B" />
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>روابط التواصل الاجتماعي</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: isDark ? '#AAA' : '#888' }}>فيسبوك</label>
            <input type="url" value={appSettings.facebookLink} onChange={e => setAppSettings({ ...appSettings, facebookLink: e.target.value })} placeholder="https://facebook.com/..." className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: isDark ? '#AAA' : '#888' }}>تويتر / X</label>
            <input type="url" value={appSettings.twitterLink} onChange={e => setAppSettings({ ...appSettings, twitterLink: e.target.value })} placeholder="https://twitter.com/..." className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: isDark ? '#AAA' : '#888' }}>انستغرام</label>
            <input type="url" value={appSettings.instagramLink} onChange={e => setAppSettings({ ...appSettings, instagramLink: e.target.value })} placeholder="https://instagram.com/..." className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: isDark ? '#AAA' : '#888' }}>تيليغرام</label>
            <input type="url" value={appSettings.telegramLink} onChange={e => setAppSettings({ ...appSettings, telegramLink: e.target.value })} placeholder="https://t.me/..." className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} dir="ltr" />
          </div>
        </div>
      </div>

      {/* ===== Transaction Limits ===== */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} color="#5C1A1B" />
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>حدود المعاملات</h3>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-medium" style={{ color: isDark ? '#CCC' : '#666' }}>الحد الأدنى للإيداع</p>
          <div className="grid grid-cols-3 gap-2">
            {(['YER', 'SAR', 'USD'] as const).map(cur => (
              <div key={cur}>
                <label className="text-[10px] block mb-0.5" style={{ color: currencyBadgeColors[cur] }}>{currencyNames[cur]}</label>
                <input type="number" value={appSettings[`minDeposit${cur}` as keyof typeof appSettings] as number} onChange={e => setAppSettings({ ...appSettings, [`minDeposit${cur}`]: parseInt(e.target.value) || 0 })} className="w-full px-2 py-2 rounded-xl text-xs outline-none text-center" style={inputStyle} dir="ltr" />
              </div>
            ))}
          </div>
          <p className="text-xs font-medium" style={{ color: isDark ? '#CCC' : '#666' }}>الحد الأدنى للسحب</p>
          <div className="grid grid-cols-3 gap-2">
            {(['YER', 'SAR', 'USD'] as const).map(cur => (
              <div key={cur}>
                <label className="text-[10px] block mb-0.5" style={{ color: currencyBadgeColors[cur] }}>{currencyNames[cur]}</label>
                <input type="number" value={appSettings[`minWithdraw${cur}` as keyof typeof appSettings] as number} onChange={e => setAppSettings({ ...appSettings, [`minWithdraw${cur}`]: parseInt(e.target.value) || 0 })} className="w-full px-2 py-2 rounded-xl text-xs outline-none text-center" style={inputStyle} dir="ltr" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Legal Documents ===== */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center gap-2 mb-4">
          <Scale size={16} color="#5C1A1B" />
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>الوثائق القانونية</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: isDark ? '#AAA' : '#888' }}>الشروط والأحكام</label>
            <textarea value={appSettings.termsAndConditions} onChange={e => setAppSettings({ ...appSettings, termsAndConditions: e.target.value })} rows={6} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: isDark ? '#AAA' : '#888' }}>سياسة الخصوصية</label>
            <textarea value={appSettings.privacyPolicy} onChange={e => setAppSettings({ ...appSettings, privacyPolicy: e.target.value })} rows={6} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
          </div>
        </div>
      </div>

      {/* ===== Save App Settings ===== */}
      <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveAppSettings}
        className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold text-white"
        style={{ background: '#5C1A1B' }}>
        {settingsSaved ? <><CheckCircle2 size={18} /> تم حفظ الإعدادات</> : <><Save size={18} /> حفظ إعدادات التطبيق</>}
      </motion.button>

      {/* ===== Role Management (super_admin only) ===== */}
      {isSuperAdmin && (
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={16} color="#5C1A1B" />
              <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>إدارة الأدوار</h3>
            </div>
            <button onClick={() => { setShowRoleManagement(!showRoleManagement); if (!showRoleManagement) loadAdminUsers(); }}
              className="p-1.5 rounded-lg transition-all" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
              <ChevronDown size={14} color={isDark ? '#AAA' : '#888'} style={{ transform: showRoleManagement ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          </div>

          {showRoleManagement && (
            <div className="space-y-2">
              {roleLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                </div>
              ) : adminUsers.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: isDark ? '#555' : '#AAA' }}>لا يوجد مدراء آخرون</p>
              ) : (
                adminUsers.map(adminUser => {
                  const adminRoleInfo = getRoleDisplayInfo(adminUser.role as UserRole);
                  return (
                    <div key={adminUser.id} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${adminRoleInfo.color}15` }}>
                        <span className="text-[9px] font-bold" style={{ color: adminRoleInfo.color }}>{adminRoleInfo.label[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{adminUser.name}</p>
                        <p className="text-[10px] truncate" style={{ color: isDark ? '#666' : '#AAA' }} dir="ltr">{adminUser.email}</p>
                      </div>
                      <select
                        value={adminUser.role}
                        onChange={(e) => handleChangeRole(adminUser.id, e.target.value)}
                        className="text-[10px] px-2 py-1 rounded-lg outline-none"
                        style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: adminRoleInfo.color }}
                      >
                        {adminRoles.map(r => (
                          <option key={r} value={r}>{getRoleDisplayInfo(r).label}</option>
                        ))}
                      </select>
                      <button onClick={() => handleRevokeAdmin(adminUser.id)}
                        className="p-1.5 rounded-lg" style={{ background: 'rgba(92,26,27,0.08)' }}>
                        <Trash2 size={12} color="#5C1A1B" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== System Info ===== */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <h3 className="text-sm font-bold mb-3" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>معلومات النظام</h3>
        <div className="space-y-3">
          {[
            { icon: AlertTriangle, label: 'وضع الصيانة', value: appSettings.maintenanceMode ? 'مفعّل' : 'معطّل', color: appSettings.maintenanceMode ? '#5C1A1B' : '#10B981' },
            { icon: Clock, label: 'متوسط وقت التنفيذ', value: '5-30 دقيقة', color: '#3B82F6' },
            { icon: ShieldCheck, label: 'التحقق المطلوب', value: 'مفعّل', color: '#10B981' },
            { icon: Bell, label: 'الإشعارات', value: 'مفعّلة', color: '#EC4899' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Icon size={14} strokeWidth={1.5} color={item.color} />
                  <span className="text-xs" style={{ color: isDark ? '#CCC' : '#666' }}>{item.label}</span>
                </div>
                <span className="text-xs font-medium" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{item.value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== Bulk Notification ===== */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <Send size={16} color="#5C1A1B" />
          <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>إرسال إشعار جماعي</h3>
        </div>
        <div className="space-y-2">
          <input type="text" placeholder="عنوان الإشعار" value={bulkNotif.title} onChange={e => setBulkNotif({ ...bulkNotif, title: e.target.value })} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={inputStyle} />
          <textarea placeholder="نص الإشعار" value={bulkNotif.body} onChange={e => setBulkNotif({ ...bulkNotif, body: e.target.value })} rows={3} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={inputStyle} />
          <motion.button whileTap={{ scale: 0.95 }} onClick={onSendBulkNotif} disabled={!bulkNotif.title || !bulkNotif.body} className="w-full py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: '#5C1A1B' }}>إرسال لجميع المستخدمين ({firebaseUsers.length})</motion.button>
        </div>
      </div>

      {/* ===== Audit Log ===== */}
      {auditLog.length > 0 && (
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} color="#5C1A1B" />
            <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>سجل العمليات</h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {auditLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#5C1A1B' }} />
                <div className="flex-1">
                  <p className="text-xs" style={{ color: isDark ? '#CCC' : '#333' }}>{entry.action}</p>
                  <p className="text-[10px]" style={{ color: isDark ? '#555' : '#AAA' }}>{timeAgo(entry.time)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== Email Queue ===== */}
      <div className="rounded-2xl p-5" style={cardStyle}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Mail size={16} color="#5C1A1B" />
            <h3 className="text-sm font-bold" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>طابور البريد الإلكتروني</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: emailQueue.length > 0 ? 'rgba(92,26,27,0.1)' : 'rgba(16,185,129,0.1)', color: emailQueue.length > 0 ? '#5C1A1B' : '#10B981' }}>
              {formatNumber(emailQueue.length)} بريد
            </span>
            <button
              onClick={() => setShowEmailQueue(!showEmailQueue)}
              className="p-1.5 rounded-lg transition-all"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            >
              <ChevronDown size={14} color={isDark ? '#AAA' : '#888'} style={{ transform: showEmailQueue ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          </div>
        </div>

        {showEmailQueue && (
          <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
            {emailQueue.length === 0 ? (
              <div className="text-center py-6">
                <Mail size={24} color={isDark ? '#333' : '#DDD'} className="mx-auto" />
                <p className="text-xs mt-2" style={{ color: isDark ? '#555' : '#AAA' }}>لا توجد رسائل في الطابور</p>
              </div>
            ) : (
              emailQueue.map((email) => {
                const statusColor = email.status === 'sent' ? '#10B981' : email.status === 'failed' ? '#5C1A1B' : '#F59E0B';
                const statusLabel = email.status === 'sent' ? 'مُرسل' : email.status === 'failed' ? 'فشل' : 'في الانتظار';
                return (
                  <div key={email.id} className="p-2.5 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: isDark ? '#FFF' : '#1a1a1a' }}>{email.subject}</p>
                        <p className="text-[10px] truncate" style={{ color: isDark ? '#666' : '#AAA' }}>إلى: {email.userName}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${statusColor}15`, color: statusColor }}>{statusLabel}</span>
                        <button
                          onClick={() => email.id && deleteEmailFromQueue(email.id)}
                          className="p-1 rounded"
                          style={{ background: 'rgba(92,26,27,0.08)' }}
                        >
                          <Trash2 size={10} color="#5C1A1B" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', color: isDark ? '#888' : '#AAA' }}>
                        {emailTypeLabels[email.templateType] || email.templateType}
                      </span>
                      <span className="text-[9px]" style={{ color: isDark ? '#555' : '#BBB' }}>{timeAgo(email.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
