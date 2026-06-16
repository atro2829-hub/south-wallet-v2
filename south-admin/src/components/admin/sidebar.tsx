'use client';

import { useAdminStore, AdminRole } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  ArrowDownCircle,
  ArrowUpCircle,
  Shield,
  Server,
  DollarSign,
  Gift,
  Tag,
  Image,
  Building2,
  MessageCircle,
  Link2,
  FileText,
  Layers,
  Eye,
  Settings,
  Bell,
  Activity,
  Database,
  Code,
  LogOut,
  X,
  Moon,
  Sun,
  Percent,
  TrendingUp,
  Send,
  Palette,
  Zap,
  Package,
  Bot,
  Smartphone,
  Sparkles,
  Globe,
  Monitor,
  Ticket,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';
import { APP_ICON_BASE64 } from '@/lib/app-icon';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: AdminRole[];
  badge?: number;
}

const navItems: NavItem[] = [
  // Admin + Owner sections
  { id: 'dashboard', label: 'لوحة المعلومات', icon: LayoutDashboard, roles: ['admin', 'owner'] },
  { id: 'users', label: 'إدارة المستخدمين', icon: Users, roles: ['admin', 'owner'] },
  { id: 'orders', label: 'إدارة الطلبات', icon: ShoppingCart, roles: ['admin', 'owner'] },
  { id: 'escrow', label: 'إدارة الوسيط', icon: Shield, roles: ['admin', 'owner'] },
  { id: 'deposit', label: 'طلبات الإيداع', icon: ArrowDownCircle, roles: ['admin', 'owner'] },
  { id: 'withdraw', label: 'طلبات السحب', icon: ArrowUpCircle, roles: ['admin', 'owner'] },
  { id: 'kyc', label: 'التحقق من الهوية', icon: Shield, roles: ['admin', 'owner'] },
  { id: 'instant-recharge', label: 'خدمات الشحن الفوري', icon: Zap, roles: ['admin', 'owner'] },
  { id: 'packages', label: 'إدارة الباقات', icon: Package, roles: ['admin', 'owner'] },
  { id: 'exchange-rates', label: 'أسعار الصرف', icon: DollarSign, roles: ['admin', 'owner'] },
  { id: 'commissions', label: 'ضبط العمولات', icon: Percent, roles: ['admin', 'owner'] },
  { id: 'gift-codes', label: 'أكواد الهدايا', icon: Gift, roles: ['admin', 'owner'] },
  { id: 'promo-codes', label: 'أكواد الخصم', icon: Tag, roles: ['admin', 'owner'] },
  { id: 'banners', label: 'البانرات الإعلانية', icon: Image, roles: ['admin', 'owner'] },
  { id: 'banks', label: 'الحسابات البنكية', icon: Building2, roles: ['admin', 'owner'] },
  { id: 'support-chat', label: 'شات الدعم', icon: MessageCircle, roles: ['admin', 'owner'] },
  { id: 'support-tickets', label: 'تذاكر الدعم', icon: Ticket, roles: ['admin', 'owner'] },
  { id: 'chat-monitor', label: 'مراقبة المحادثات', icon: Monitor, roles: ['admin', 'owner'] },
  { id: 'social-links', label: 'روابط التواصل', icon: Link2, roles: ['admin', 'owner'] },
  { id: 'legal-content', label: 'المحتوى القانوني', icon: FileText, roles: ['admin', 'owner'] },
  { id: 'notifications', label: 'الإشعارات', icon: Bell, roles: ['admin', 'owner'] },
  { id: 'push-notifications', label: 'إرسال إشعارات', icon: Send, roles: ['admin', 'owner'] },
  { id: 'settings', label: 'الإعدادات', icon: Settings, roles: ['admin', 'owner'] },
  // Owner-only sections
  { id: 'card-colors', label: 'ألوان البطائق', icon: Palette, roles: ['owner'] },
  { id: 'g2bulk', label: 'G2Bulk', icon: Globe, roles: ['owner'] },
  { id: 'sections', label: 'إدارة الأقسام', icon: Layers, roles: ['owner'] },
  { id: 'visibility', label: 'إعدادات الظهور', icon: Eye, roles: ['owner'] },
  { id: 'activity-log', label: 'سجل النشاط', icon: Activity, roles: ['owner'] },
  { id: 'backup', label: 'النسخ الاحتياطي', icon: Database, roles: ['owner'] },
];

export default function Sidebar() {
  const { activePanel, setActivePanel, sidebarOpen, setSidebarOpen, adminUser, logout } = useAdminStore();
  const { theme, setTheme } = useTheme();

  // Filter based on user role - owner-only items completely hidden for admin
  const filteredItems = navItems.filter(
    (item) => adminUser && item.roles.includes(adminUser.role)
  );

  const adminItems = filteredItems.filter((item) => item.roles.includes('admin'));
  const ownerOnlyItems = filteredItems.filter((item) => !item.roles.includes('admin'));

  const handleLogout = async () => {
    try {
      await signOut(auth);
      logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    // Also update zustand store for consistency
    useAdminStore.getState().setTheme(newTheme as 'light' | 'dark');
  };

  const NavButton = ({ item }: { item: NavItem }) => {
    const isActive = activePanel === item.id;
    const Icon = item.icon;
    return (
      <button
        onClick={() => setActivePanel(item.id)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-purple-600/20 text-purple-400 dark:text-purple-300 border border-purple-500/30'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className={cn('w-5 h-5 shrink-0', isActive && 'text-purple-500')} />
        <span className="flex-1 text-right">{item.label}</span>
        {item.badge && item.badge > 0 && (
          <Badge className="bg-red-500 text-white text-xs h-5 min-w-5 flex items-center justify-center">
            {item.badge}
          </Badge>
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 right-0 h-full w-72 z-50 flex flex-col transition-transform duration-300 ease-in-out',
          'bg-background border-l border-border shadow-xl',
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border admin-gradient">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center overflow-hidden">
                <img
                  src={APP_ICON_BASE64}
                  alt="الإدارة"
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      target.parentElement.innerHTML = '<svg class="w-5 h-5 text-purple-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
                    }
                  }}
                />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">الإدارة</h2>
                <p className="text-xs text-purple-300/70">{adminUser?.displayName}</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white/70 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {adminUser && (
            <div className="mt-2 flex items-center gap-2">
              <Badge className="bg-purple-600/50 text-purple-100 border-purple-500/50 text-xs">
                {adminUser.role === 'owner' ? 'المالك' : 'مدير'}
              </Badge>
            </div>
          )}
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
          {adminItems.map((item) => (
            <NavButton key={item.id} item={item} />
          ))}

          {ownerOnlyItems.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-4 py-2 mt-4 mb-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground font-medium">صلاحيات المالك فقط</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              {ownerOnlyItems.map((item) => (
                <NavButton key={item.id} item={item} />
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
