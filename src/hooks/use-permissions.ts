'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { getPermissions, canAccessTab, isAdminRole, type Permission, type UserRole } from '@/lib/permissions';

export function usePermissions() {
  const user = useAppStore(state => state.user);
  const role = (user?.role || 'user') as UserRole;

  const permissions = useMemo(() => getPermissions(role), [role]);
  const isAdmin = useMemo(() => isAdminRole(role), [role]);

  const checkTab = useMemo(() => {
    return (tabId: string) => canAccessTab(role, tabId);
  }, [role]);

  return {
    role,
    permissions,
    isAdmin,
    canAccessTab: checkTab,
  };
}
