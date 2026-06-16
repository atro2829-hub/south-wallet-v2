'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Edit3,
  Check,
  X,
  Loader2,
  Search,
  Eye,
  EyeOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { database } from '@/lib/firebase';
import { ref, get, set, update, remove, onValue, push } from 'firebase/database';
import { useAdminStore } from '@/lib/store';

interface Employee {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: 'employee' | 'supervisor' | 'manager';
  isActive: boolean;
  permissions: Record<string, EmployeePermission>;
  createdAt: string;
}

interface EmployeePermission {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

const permissionModules = [
  { id: 'users', label: 'المستخدمين', icon: Users },
  { id: 'deposit', label: 'الإيداع', icon: Users },
  { id: 'withdraw', label: 'السحب', icon: Users },
  { id: 'orders', label: 'الطلبات', icon: Users },
  { id: 'services', label: 'الخدمات', icon: Users },
  { id: 'settings', label: 'الإعدادات', icon: Users },
  { id: 'reports', label: 'التقارير', icon: Users },
  { id: 'support', label: 'الدعم', icon: Users },
  { id: 'financial', label: 'المالية', icon: Users },
  { id: 'security', label: 'الأمان', icon: Users },
];

const roleLabels: Record<string, string> = {
  employee: 'موظف',
  supervisor: 'مشرف',
  manager: 'مدير',
};

const roleColors: Record<string, string> = {
  employee: '#3B82F6',
  supervisor: '#F59E0B',
  manager: '#8B5CF6',
};

export default function EmployeesPanel() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Add form state
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'employee' | 'supervisor' | 'manager'>('employee');
  const [newPermissions, setNewPermissions] = useState<Record<string, EmployeePermission>>({});

  // Load employees from Firebase
  useEffect(() => {
    const empRef = ref(database, 'adminSettings/employees');
    const unsub = onValue(empRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list: Employee[] = Object.entries(data).map(([key, val]: [string, any]) => ({
          id: key,
          userId: val.userId || '',
          displayName: val.displayName || '',
          email: val.email || '',
          role: val.role || 'employee',
          isActive: val.isActive !== false,
          permissions: val.permissions || {},
          createdAt: val.createdAt || '',
        }));
        setEmployees(list);
      } else {
        setEmployees([]);
      }
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAddEmployee = async () => {
    if (!newDisplayName.trim() || !newEmail.trim()) return;
    try {
      const empRef = push(ref(database, 'adminSettings/employees'));
      const id = empRef.key;
      await set(empRef, {
        userId: '',
        displayName: newDisplayName.trim(),
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        isActive: true,
        permissions: newPermissions,
        createdAt: new Date().toISOString(),
      });
      setNewDisplayName('');
      setNewEmail('');
      setNewRole('employee');
      setNewPermissions({});
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding employee:', error);
    }
  };

  const handleToggleActive = async (emp: Employee) => {
    try {
      await update(ref(database, `adminSettings/employees/${emp.id}`), {
        isActive: !emp.isActive,
      });
    } catch (error) {
      console.error('Error toggling employee:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    try {
      await remove(ref(database, `adminSettings/employees/${id}`));
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const handleUpdatePermissions = async (emp: Employee, moduleId: string, permission: EmployeePermission) => {
    try {
      const updatedPermissions = { ...emp.permissions, [moduleId]: permission };
      await update(ref(database, `adminSettings/employees/${emp.id}`), {
        permissions: updatedPermissions,
      });
    } catch (error) {
      console.error('Error updating permissions:', error);
    }
  };

  const togglePermission = (moduleId: string, permKey: keyof EmployeePermission) => {
    setNewPermissions(prev => {
      const current = prev[moduleId] || { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false };
      return { ...prev, [moduleId]: { ...current, [permKey]: !current[permKey] } };
    });
  };

  const filteredEmployees = employees.filter(e =>
    e.displayName.includes(searchQuery.trim()) || e.email.includes(searchQuery.trim())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ios-large-title text-foreground">إدارة الموظفين</h1>
          <p className="text-muted-foreground text-sm mt-1">إضافة موظفين وتحديد صلاحياتهم في لوحة الإدارة</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 text-white text-sm font-medium shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-transform"
        >
          <UserPlus className="w-4 h-4" />
          إضافة موظف
        </button>
      </div>

      {/* Search */}
      <div className="ios-card p-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن موظف..."
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Add Employee Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="ios-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">إضافة موظف جديد</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">اسم الموظف</label>
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-muted/30 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    placeholder="الاسم الكامل"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-muted/30 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    placeholder="email@example.com"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">الدور الوظيفي</label>
                <div className="flex gap-2">
                  {(['employee', 'supervisor', 'manager'] as const).map(role => (
                    <button
                      key={role}
                      onClick={() => setNewRole(role)}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
                        newRole === role ? "text-white shadow-lg" : "bg-muted/30 text-muted-foreground"
                      )}
                      style={newRole === role ? { background: roleColors[role] } : {}}
                    >
                      {roleLabels[role]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">الصلاحيات</label>
                <div className="space-y-2">
                  {permissionModules.map(mod => {
                    const perms = newPermissions[mod.id] || { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false };
                    const hasAny = perms.canView || perms.canCreate || perms.canEdit || perms.canDelete || perms.canApprove;
                    return (
                      <div key={mod.id} className={cn("p-3 rounded-xl border", hasAny ? "border-purple-500/30 bg-purple-500/5" : "border-border/30 bg-muted/10")}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">{mod.label}</span>
                          <button
                            onClick={() => {
                              if (hasAny) {
                                setNewPermissions(prev => { const next = { ...prev }; delete next[mod.id]; return next; });
                              } else {
                                setNewPermissions(prev => ({ ...prev, [mod.id]: { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: false } }));
                              }
                            }}
                            className={cn("text-xs px-2 py-1 rounded-lg", hasAny ? "bg-purple-500/10 text-purple-500" : "bg-muted/30 text-muted-foreground")}
                          >
                            {hasAny ? 'تفعيل الكل' : 'تعطيل'}
                          </button>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {(['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'] as const).map(pk => {
                            const labels: Record<string, string> = { canView: 'عرض', canCreate: 'إنشاء', canEdit: 'تعديل', canDelete: 'حذف', canApprove: 'موافقة' };
                            return (
                              <button
                                key={pk}
                                onClick={() => togglePermission(mod.id, pk)}
                                className={cn("px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all", perms[pk] ? "bg-purple-500 text-white" : "bg-muted/30 text-muted-foreground")}
                              >
                                {labels[pk]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAddEmployee}
                  disabled={!newDisplayName.trim() || !newEmail.trim()}
                  className="flex-1 py-3 rounded-xl bg-purple-500 text-white font-medium text-sm shadow-lg shadow-purple-500/25 active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  إضافة الموظف
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 rounded-xl bg-muted/30 text-muted-foreground font-medium text-sm"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Employees List */}
      <div className="space-y-3">
        {filteredEmployees.length === 0 ? (
          <div className="ios-card p-8 flex flex-col items-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">لا يوجد موظفين</p>
          </div>
        ) : (
          filteredEmployees.map(emp => (
            <div key={emp.id} className={cn("ios-card p-4", !emp.isActive && "opacity-50")}>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold"
                  style={{ background: roleColors[emp.role] || '#666' }}
                >
                  {emp.displayName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{emp.displayName}</p>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white"
                      style={{ background: roleColors[emp.role] || '#666' }}
                    >
                      {roleLabels[emp.role]}
                    </span>
                    {!emp.isActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-500/10 text-red-500">معطّل</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate" dir="ltr">{emp.email}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleActive(emp)}
                    className={cn("p-2 rounded-lg transition-colors", emp.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}
                    title={emp.isActive ? 'تعطيل' : 'تفعيل'}
                  >
                    {emp.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setEditingId(editingId === emp.id ? null : emp.id)}
                    className="p-2 rounded-lg bg-purple-500/10 text-purple-500 transition-colors"
                    title="تعديل الصلاحيات"
                  >
                    <Shield className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(emp.id)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-500 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Inline permission editing */}
              <AnimatePresence>
                {editingId === emp.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-3 pt-3 border-t border-border/30"
                  >
                    <div className="space-y-2">
                      {permissionModules.map(mod => {
                        const perms = emp.permissions[mod.id] || { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false };
                        const hasAny = perms.canView || perms.canCreate || perms.canEdit || perms.canDelete || perms.canApprove;
                        return (
                          <div key={mod.id} className={cn("p-2.5 rounded-lg", hasAny ? "bg-purple-500/5" : "bg-muted/10")}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-foreground min-w-[80px]">{mod.label}</span>
                              {(['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'] as const).map(pk => {
                                const labels: Record<string, string> = { canView: 'عرض', canCreate: 'إنشاء', canEdit: 'تعديل', canDelete: 'حذف', canApprove: 'موافقة' };
                                return (
                                  <button
                                    key={pk}
                                    onClick={() => handleUpdatePermissions(emp, mod.id, { ...perms, [pk]: !perms[pk] })}
                                    className={cn("px-2 py-0.5 rounded text-[10px] font-medium transition-all", perms[pk] ? "bg-purple-500 text-white" : "bg-muted/30 text-muted-foreground")}
                                  >
                                    {labels[pk]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
