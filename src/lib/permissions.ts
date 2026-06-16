// Permission system for محفظة الجنوب admin panel

export type UserRole = 'user' | 'admin' | 'moderator' | 'super_admin' | 'owner';

export interface Permission {
  // Admin tabs
  canViewOverview: boolean;
  canViewOrders: boolean;
  canViewUsers: boolean;
  canViewDeposit: boolean;
  canViewWithdraw: boolean;
  canViewKyc: boolean;
  canViewBanks: boolean;
  canViewExchangeRates: boolean;
  canViewProducts: boolean;
  canViewProviders: boolean;
  canViewPromoCodes: boolean;
  canViewBanners: boolean;
  canViewNotifications: boolean;
  canViewAuditLog: boolean;
  canViewCharts: boolean;
  canViewAnalytics: boolean;
  canViewReports: boolean;
  canViewSettings: boolean;

  // Actions
  canAdjustBalance: boolean;
  canBlockUsers: boolean;
  canManageRoles: boolean;
  canApproveDeposit: boolean;
  canApproveWithdraw: boolean;
  canManageProducts: boolean;
  canManageProviders: boolean;
  canManageBanks: boolean;
  canManageExchangeRates: boolean;
  canManagePromoCodes: boolean;
  canManageBanners: boolean;
  canSendBulkNotifications: boolean;
  canCompleteOrders: boolean;
  canCancelOrders: boolean;
  canApproveKyc: boolean;
}

// Permission matrix per role
const rolePermissions: Record<UserRole, Permission> = {
  owner: {
    canViewOverview: true,
    canViewOrders: true,
    canViewUsers: true,
    canViewDeposit: true,
    canViewWithdraw: true,
    canViewKyc: true,
    canViewBanks: true,
    canViewExchangeRates: true,
    canViewProducts: true,
    canViewProviders: true,
    canViewPromoCodes: true,
    canViewBanners: true,
    canViewNotifications: true,
    canViewAuditLog: true,
    canViewCharts: true,
    canViewAnalytics: true,
    canViewReports: true,
    canViewSettings: true,

    canAdjustBalance: true,
    canBlockUsers: true,
    canManageRoles: true,
    canApproveDeposit: true,
    canApproveWithdraw: true,
    canManageProducts: true,
    canManageProviders: true,
    canManageBanks: true,
    canManageExchangeRates: true,
    canManagePromoCodes: true,
    canManageBanners: true,
    canSendBulkNotifications: true,
    canCompleteOrders: true,
    canCancelOrders: true,
    canApproveKyc: true,
  },
  super_admin: {
    canViewOverview: true,
    canViewOrders: true,
    canViewUsers: true,
    canViewDeposit: true,
    canViewWithdraw: true,
    canViewKyc: true,
    canViewBanks: true,
    canViewExchangeRates: true,
    canViewProducts: true,
    canViewProviders: true,
    canViewPromoCodes: true,
    canViewBanners: true,
    canViewNotifications: true,
    canViewAuditLog: true,
    canViewCharts: true,
    canViewAnalytics: true,
    canViewReports: true,
    canViewSettings: true,

    canAdjustBalance: true,
    canBlockUsers: true,
    canManageRoles: true,
    canApproveDeposit: true,
    canApproveWithdraw: true,
    canManageProducts: true,
    canManageProviders: true,
    canManageBanks: true,
    canManageExchangeRates: true,
    canManagePromoCodes: true,
    canManageBanners: true,
    canSendBulkNotifications: true,
    canCompleteOrders: true,
    canCancelOrders: true,
    canApproveKyc: true,
  },
  admin: {
    canViewOverview: true,
    canViewOrders: true,
    canViewUsers: true,
    canViewDeposit: true,
    canViewWithdraw: true,
    canViewKyc: true,
    canViewBanks: true,
    canViewExchangeRates: true,
    canViewProducts: true,
    canViewProviders: true,
    canViewPromoCodes: true,
    canViewBanners: true,
    canViewNotifications: true,
    canViewAuditLog: true,
    canViewCharts: true,
    canViewAnalytics: true,
    canViewReports: true,
    canViewSettings: false, // No settings tab for admin

    canAdjustBalance: true,
    canBlockUsers: true,
    canManageRoles: false, // No role management for admin
    canApproveDeposit: true,
    canApproveWithdraw: true,
    canManageProducts: true,
    canManageProviders: true,
    canManageBanks: true,
    canManageExchangeRates: true,
    canManagePromoCodes: true,
    canManageBanners: true,
    canSendBulkNotifications: true,
    canCompleteOrders: true,
    canCancelOrders: true,
    canApproveKyc: true,
  },
  moderator: {
    canViewOverview: true,
    canViewOrders: true,
    canViewUsers: true,
    canViewDeposit: true,
    canViewWithdraw: true,
    canViewKyc: true,
    canViewBanks: false,
    canViewExchangeRates: false,
    canViewProducts: false,
    canViewProviders: false,
    canViewPromoCodes: false,
    canViewBanners: false,
    canViewNotifications: false,
    canViewAuditLog: false,
    canViewCharts: true,
    canViewAnalytics: false,
    canViewReports: false,
    canViewSettings: false,

    canAdjustBalance: false, // No balance adjustment for moderators
    canBlockUsers: false,
    canManageRoles: false,
    canApproveDeposit: true,
    canApproveWithdraw: true,
    canManageProducts: false,
    canManageProviders: false,
    canManageBanks: false,
    canManageExchangeRates: false,
    canManagePromoCodes: false,
    canManageBanners: false,
    canSendBulkNotifications: false,
    canCompleteOrders: true,
    canCancelOrders: true,
    canApproveKyc: true,
  },
  user: {
    canViewOverview: false,
    canViewOrders: false,
    canViewUsers: false,
    canViewDeposit: false,
    canViewWithdraw: false,
    canViewKyc: false,
    canViewBanks: false,
    canViewExchangeRates: false,
    canViewProducts: false,
    canViewProviders: false,
    canViewPromoCodes: false,
    canViewBanners: false,
    canViewNotifications: false,
    canViewAuditLog: false,
    canViewCharts: false,
    canViewAnalytics: false,
    canViewReports: false,
    canViewSettings: false,

    canAdjustBalance: false,
    canBlockUsers: false,
    canManageRoles: false,
    canApproveDeposit: false,
    canApproveWithdraw: false,
    canManageProducts: false,
    canManageProviders: false,
    canManageBanks: false,
    canManageExchangeRates: false,
    canManagePromoCodes: false,
    canManageBanners: false,
    canSendBulkNotifications: false,
    canCompleteOrders: false,
    canCancelOrders: false,
    canApproveKyc: false,
  },
};

// Admin tab ID to permission mapping
export const tabPermissionMap: Record<string, keyof Permission> = {
  overview: 'canViewOverview',
  orders: 'canViewOrders',
  users: 'canViewUsers',
  deposit: 'canViewDeposit',
  withdraw: 'canViewWithdraw',
  kyc: 'canViewKyc',
  banks: 'canViewBanks',
  exchangeRates: 'canViewExchangeRates',
  products: 'canViewProducts',
  providers: 'canViewProviders',
  rechargeProviders: 'canViewProducts',
  entertainmentServices: 'canViewProducts',
  codes: 'canViewPromoCodes',
  banners: 'canViewBanners',
  notifications: 'canViewNotifications',
  auditLog: 'canViewAuditLog',
  charts: 'canViewCharts',
  analytics: 'canViewAnalytics',
  reports: 'canViewReports',
  settings: 'canViewSettings',
};

/**
 * Get permissions for a given role
 */
export function getPermissions(role: UserRole): Permission {
  return rolePermissions[role] || rolePermissions.user;
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: keyof Permission): boolean {
  return rolePermissions[role]?.[permission] ?? false;
}

/**
 * Check if a role can access a specific admin tab
 */
export function canAccessTab(role: UserRole, tabId: string): boolean {
  const permissionKey = tabPermissionMap[tabId];
  if (!permissionKey) return false;
  return hasPermission(role, permissionKey);
}

/**
 * Get list of accessible tabs for a role
 */
export function getAccessibleTabs(role: UserRole): string[] {
  return Object.entries(tabPermissionMap)
    .filter(([_, permKey]) => hasPermission(role, permKey))
    .map(([tabId]) => tabId);
}

/**
 * Check if user is an admin-level role (admin, moderator, or super_admin)
 */
export function isAdminRole(role: UserRole): boolean {
  return role === 'admin' || role === 'moderator' || role === 'super_admin' || role === 'owner';
}

/**
 * Get role display info in Arabic
 */
export function getRoleDisplayInfo(role: UserRole): { label: string; color: string; description: string } {
  switch (role) {
    case 'owner':
      return { label: 'مالك المشروع', color: '#8B5CF6', description: 'تحكم كامل بالمحفظة والإعدادات والبنية التحتية' };
    case 'super_admin':
      return { label: 'مدير أعلى', color: '#5C1A1B', description: 'صلاحيات كاملة' };
    case 'admin':
      return { label: 'مدير', color: '#F59E0B', description: 'جميع الصلاحيات ما عدا الإعدادات وإدارة الأدوار' };
    case 'moderator':
      return { label: 'مشرف', color: '#2563EB', description: 'عرض الطلبات والموافقة على الإيداع والسحب وعرض المستخدمين' };
    default:
      return { label: 'مستخدم', color: '#666', description: 'حساب عادي' };
  }
}

// All available roles (for role management dropdown)
export const adminRoles: UserRole[] = ['admin', 'moderator', 'super_admin', 'owner'];
