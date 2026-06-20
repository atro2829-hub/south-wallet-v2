'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Plus, Edit3, Trash2, Users, Check, X,
  Loader2, Search, Shield, Crown, Headphones, Cpu,
  Megaphone, Package, ChevronDown, ChevronUp, UserPlus,
  RefreshCw, AlertCircle, Eye, EyeOff, Hash,
} from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';

interface Department {
  id: string;
  name: string;
  name_en: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  member_count?: number;
}

interface AdminUser {
  id: string;
  user_id: string | null;
  email: string;
  display_name: string;
  avatar_url: string;
  role: 'super_admin' | 'admin' | 'manager' | 'supervisor' | 'employee' | 'support';
  department_id: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  department?: Department;
}

interface Permission {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
}

const PERMISSION_MODULES = [
  { id: 'users', label: 'المستخدمين' },
  { id: 'orders', label: 'الطلبات' },
  { id: 'deposit', label: 'الإيداع' },
  { id: 'withdraw', label: 'السحب' },
  { id: 'kyc', label: 'التحقق KYC' },
  { id: 'support', label: 'الدعم الفني' },
  { id: 'services', label: 'الخدمات والمنتجات' },
  { id: 'financial', label: 'المالية والتقارير' },
  { id: 'settings', label: 'الإعدادات' },
  { id: 'security', label: 'الأمن والسجلات' },
  { id: 'notifications', label: 'الإشعارات' },
  { id: 'marketing', label: 'التسويق' },
];

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  super_admin: { label: 'مدير عام', color: '#DC2626', bg: '#FEE2E2' },
  admin:       { label: 'مدير',     color: '#7C3AED', bg: '#EDE9FE' },
  manager:     { label: 'مشرف قسم', color: '#2563EB', bg: '#DBEAFE' },
  supervisor:  { label: 'مشرف',    color: '#D97706', bg: '#FEF3C7' },
  employee:    { label: 'موظف',    color: '#059669', bg: '#D1FAE5' },
  support:     { label: 'دعم فني', color: '#0891B2', bg: '#CFFAFE' },
};

const DEPT_ICONS: Record<string, React.ElementType> = {
  crown: Crown, shield: Shield, headset: Headphones,
  cpu: Cpu, megaphone: Megaphone, package: Package,
  building: Building2, users: Users,
};

function DeptIcon({ icon, color }: { icon: string; color: string }) {
  const Icon = DEPT_ICONS[icon] || Building2;
  return <Icon className="w-4 h-4" style={{ color }} />;
}

export default function DepartmentsPanel() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'departments' | 'members'>('departments');
  const [search, setSearch] = useState('');
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Department form
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', name_en: '', description: '', color: '#5C1A1B', icon: 'building' });

  // Admin user form
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userForm, setUserForm] = useState({ email: '', display_name: '', role: 'employee' as AdminUser['role'], department_id: '' });
  const [userPermissions, setUserPermissions] = useState<Record<string, Permission>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: depts }, { data: users }] = await Promise.all([
        supabaseAdmin.from('departments').select('*').order('sort_order'),
        supabaseAdmin.from('admin_users').select('*, department:departments(*)').order('created_at', { ascending: false }),
      ]);

      // Attach member counts
      const counts: Record<string, number> = {};
      (users || []).forEach((u: AdminUser) => {
        if (u.department_id) counts[u.department_id] = (counts[u.department_id] || 0) + 1;
      });

      setDepartments((depts || []).map((d: Department) => ({ ...d, member_count: counts[d.id] || 0 })));
      setAdminUsers(users || []);
    } catch (e: any) {
      setError(e.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Departments CRUD ──────────────────────────────────────────
  const saveDepartment = async () => {
    if (!deptForm.name.trim()) return;
    setSaving(true);
    try {
      if (editingDept) {
        await supabaseAdmin.from('departments').update({ ...deptForm, updated_at: new Date().toISOString() }).eq('id', editingDept.id);
      } else {
        await supabaseAdmin.from('departments').insert({ ...deptForm, sort_order: departments.length });
      }
      setShowDeptForm(false);
      setEditingDept(null);
      setDeptForm({ name: '', name_en: '', description: '', color: '#5C1A1B', icon: 'building' });
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteDepartment = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم إلغاء تعيين أعضائه.')) return;
    await supabaseAdmin.from('departments').delete().eq('id', id);
    await loadData();
  };

  const toggleDeptActive = async (dept: Department) => {
    await supabaseAdmin.from('departments').update({ is_active: !dept.is_active }).eq('id', dept.id);
    await loadData();
  };

  // ── Admin Users CRUD ──────────────────────────────────────────
  const saveAdminUser = async () => {
    if (!userForm.email.trim() || !userForm.display_name.trim()) return;
    setSaving(true);
    try {
      let userId = editingUser?.id;
      if (editingUser) {
        await supabaseAdmin.from('admin_users').update({
          email: userForm.email,
          display_name: userForm.display_name,
          role: userForm.role,
          department_id: userForm.department_id || null,
          updated_at: new Date().toISOString(),
        }).eq('id', editingUser.id);
      } else {
        const { data } = await supabaseAdmin.from('admin_users').insert({
          email: userForm.email,
          display_name: userForm.display_name,
          role: userForm.role,
          department_id: userForm.department_id || null,
        }).select().single();
        userId = data?.id;
      }

      // Save permissions
      if (userId) {
        for (const [module, perm] of Object.entries(userPermissions)) {
          await supabaseAdmin.from('admin_permissions').upsert({
            admin_user_id: userId,
            module,
            can_view: perm.can_view,
            can_create: perm.can_create,
            can_edit: perm.can_edit,
            can_delete: perm.can_delete,
            can_approve: perm.can_approve,
          }, { onConflict: 'admin_user_id,module' });
        }
      }

      setShowUserForm(false);
      setEditingUser(null);
      setUserForm({ email: '', display_name: '', role: 'employee', department_id: '' });
      setUserPermissions({});
      await loadData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleUserActive = async (user: AdminUser) => {
    await supabaseAdmin.from('admin_users').update({ is_active: !user.is_active }).eq('id', user.id);
    await loadData();
  };

  const deleteAdminUser = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العضو؟')) return;
    await supabaseAdmin.from('admin_users').delete().eq('id', id);
    await loadData();
  };

  const openEditUser = async (user: AdminUser) => {
    setEditingUser(user);
    setUserForm({ email: user.email, display_name: user.display_name, role: user.role, department_id: user.department_id || '' });
    // Load permissions
    const { data: perms } = await supabaseAdmin.from('admin_permissions').select('*').eq('admin_user_id', user.id);
    const permMap: Record<string, Permission> = {};
    (perms || []).forEach((p: any) => { permMap[p.module] = p; });
    setUserPermissions(permMap);
    setShowUserForm(true);
  };

  const togglePermission = (module: string, field: keyof Permission) => {
    setUserPermissions(prev => ({
      ...prev,
      [module]: {
        module,
        can_view: false, can_create: false, can_edit: false, can_delete: false, can_approve: false,
        ...prev[module],
        [field]: !prev[module]?.[field],
      },
    }));
  };

  const filteredUsers = adminUsers.filter(u =>
    u.display_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-500" />
            إدارة الأقسام والمستخدمين
          </h2>
          <p className="text-sm text-muted-foreground mt-1">تحكم كامل في هيكل الأقسام وصلاحيات الفريق الإداري</p>
        </div>
        <button onClick={loadData} className="p-2 rounded-lg hover:bg-muted transition-colors" title="تحديث">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="mr-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الأقسام', value: departments.length, color: 'blue' },
          { label: 'أقسام نشطة', value: departments.filter(d => d.is_active).length, color: 'green' },
          { label: 'إجمالي الأعضاء', value: adminUsers.length, color: 'purple' },
          { label: 'أعضاء نشطون', value: adminUsers.filter(u => u.is_active).length, color: 'orange' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {[
          { id: 'departments', label: 'الأقسام', icon: Building2 },
          { id: 'members', label: 'الأعضاء', icon: Users },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.id
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* ── DEPARTMENTS TAB ── */}
          {activeTab === 'departments' && (
            <motion.div key="departments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex justify-end">
                <button
                  onClick={() => { setShowDeptForm(true); setEditingDept(null); setDeptForm({ name: '', name_en: '', description: '', color: '#5C1A1B', icon: 'building' }); }}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  إضافة قسم
                </button>
              </div>

              {/* Department Form */}
              <AnimatePresence>
                {showDeptForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="bg-card border border-border rounded-xl p-5 space-y-4">
                    <h3 className="font-semibold">{editingDept ? 'تعديل القسم' : 'إضافة قسم جديد'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">اسم القسم (عربي) *</label>
                        <input value={deptForm.name} onChange={e => setDeptForm(p => ({ ...p, name: e.target.value }))}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="مثال: العمليات المالية" />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">اسم القسم (إنجليزي)</label>
                        <input value={deptForm.name_en} onChange={e => setDeptForm(p => ({ ...p, name_en: e.target.value }))}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="e.g. Financial Operations" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm text-muted-foreground mb-1 block">الوصف</label>
                        <input value={deptForm.description} onChange={e => setDeptForm(p => ({ ...p, description: e.target.value }))}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="وصف مختصر لمهام القسم" />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">اللون</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={deptForm.color} onChange={e => setDeptForm(p => ({ ...p, color: e.target.value }))}
                            className="w-10 h-10 rounded cursor-pointer border border-border" />
                          <span className="text-sm text-muted-foreground">{deptForm.color}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">الأيقونة</label>
                        <select value={deptForm.icon} onChange={e => setDeptForm(p => ({ ...p, icon: e.target.value }))}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                          {Object.keys(DEPT_ICONS).map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setShowDeptForm(false); setEditingDept(null); }}
                        className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">إلغاء</button>
                      <button onClick={saveDepartment} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {editingDept ? 'حفظ التعديلات' : 'إضافة القسم'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Departments List */}
              <div className="space-y-3">
                {departments.map(dept => (
                  <motion.div key={dept.id} layout className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: dept.color + '20' }}>
                        <DeptIcon icon={dept.icon} color={dept.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{dept.name}</p>
                          {dept.name_en && <span className="text-xs text-muted-foreground">({dept.name_en})</span>}
                          {!dept.is_active && <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 px-2 py-0.5 rounded-full">معطل</span>}
                        </div>
                        {dept.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{dept.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        {dept.member_count} عضو
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setExpandedDept(expandedDept === dept.id ? null : dept.id)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                          {expandedDept === dept.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button onClick={() => { setEditingDept(dept); setDeptForm({ name: dept.name, name_en: dept.name_en, description: dept.description, color: dept.color, icon: dept.icon }); setShowDeptForm(true); }}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleDeptActive(dept)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                          {dept.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button onClick={() => deleteDepartment(dept.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Members of this department */}
                    <AnimatePresence>
                      {expandedDept === dept.id && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                          className="border-t border-border overflow-hidden">
                          <div className="p-4 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground mb-3">أعضاء القسم</p>
                            {adminUsers.filter(u => u.department_id === dept.id).length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-3">لا يوجد أعضاء في هذا القسم</p>
                            ) : (
                              adminUsers.filter(u => u.department_id === dept.id).map(user => {
                                const roleCfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.employee;
                                return (
                                  <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg bg-background">
                                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-600">
                                      {user.display_name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{user.display_name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                    </div>
                                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                      style={{ color: roleCfg.color, backgroundColor: roleCfg.bg }}>
                                      {roleCfg.label}
                                    </span>
                                    {!user.is_active && <span className="text-xs text-red-500">معطل</span>}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── MEMBERS TAB ── */}
          {activeTab === 'members' && (
            <motion.div key="members" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو البريد..."
                    className="w-full bg-background border border-border rounded-lg pr-10 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <button onClick={() => { setShowUserForm(true); setEditingUser(null); setUserForm({ email: '', display_name: '', role: 'employee', department_id: '' }); setUserPermissions({}); }}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
                  <UserPlus className="w-4 h-4" />
                  إضافة عضو
                </button>
              </div>

              {/* User Form */}
              <AnimatePresence>
                {showUserForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="bg-card border border-border rounded-xl p-5 space-y-5">
                    <h3 className="font-semibold">{editingUser ? 'تعديل العضو' : 'إضافة عضو جديد'}</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">الاسم الكامل *</label>
                        <input value={userForm.display_name} onChange={e => setUserForm(p => ({ ...p, display_name: e.target.value }))}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="الاسم الكامل" />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">البريد الإلكتروني *</label>
                        <input type="email" value={userForm.email} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="example@domain.com" dir="ltr" />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">الدور الوظيفي</label>
                        <select value={userForm.role} onChange={e => setUserForm(p => ({ ...p, role: e.target.value as any }))}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                          {Object.entries(ROLE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">القسم</label>
                        <select value={userForm.department_id} onChange={e => setUserForm(p => ({ ...p, department_id: e.target.value }))}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                          <option value="">بدون قسم</option>
                          {departments.filter(d => d.is_active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Permissions Grid */}
                    <div>
                      <p className="text-sm font-medium mb-3">الصلاحيات</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-right py-2 pr-3 font-medium text-muted-foreground">الوحدة</th>
                              {['عرض', 'إنشاء', 'تعديل', 'حذف', 'موافقة'].map(h => (
                                <th key={h} className="text-center py-2 px-2 font-medium text-muted-foreground">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {PERMISSION_MODULES.map(mod => (
                              <tr key={mod.id} className="border-b border-border/50 hover:bg-muted/30">
                                <td className="py-2 pr-3 font-medium">{mod.label}</td>
                                {(['can_view', 'can_create', 'can_edit', 'can_delete', 'can_approve'] as (keyof Permission)[]).map(field => (
                                  <td key={field} className="text-center py-2 px-2">
                                    <button onClick={() => togglePermission(mod.id, field)}
                                      className={`w-5 h-5 rounded border transition-colors ${
                                        userPermissions[mod.id]?.[field]
                                          ? 'bg-purple-600 border-purple-600 text-white'
                                          : 'border-border hover:border-purple-400'
                                      } flex items-center justify-center mx-auto`}>
                                      {userPermissions[mod.id]?.[field] && <Check className="w-3 h-3" />}
                                    </button>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setShowUserForm(false); setEditingUser(null); }}
                        className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">إلغاء</button>
                      <button onClick={saveAdminUser} disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {editingUser ? 'حفظ التعديلات' : 'إضافة العضو'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Users List */}
              <div className="space-y-2">
                {filteredUsers.map(user => {
                  const roleCfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.employee;
                  const dept = departments.find(d => d.id === user.department_id);
                  return (
                    <motion.div key={user.id} layout
                      className={`flex items-center gap-3 p-4 bg-card border rounded-xl transition-colors ${!user.is_active ? 'opacity-60 border-border' : 'border-border hover:border-purple-300 dark:hover:border-purple-700'}`}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: roleCfg.color }}>
                        {user.display_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{user.display_name}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ color: roleCfg.color, backgroundColor: roleCfg.bg }}>
                            {roleCfg.label}
                          </span>
                          {dept && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {dept.name}
                            </span>
                          )}
                          {!user.is_active && <span className="text-xs text-red-500">معطل</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                        {user.last_login_at && (
                          <p className="text-xs text-muted-foreground/60">
                            آخر تسجيل: {new Date(user.last_login_at).toLocaleDateString('ar')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditUser(user)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleUserActive(user)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                          {user.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        <button onClick={() => deleteAdminUser(user.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    {search ? 'لا توجد نتائج لبحثك' : 'لا يوجد أعضاء إداريين بعد'}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
