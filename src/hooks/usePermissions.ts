import { useContext, useMemo } from 'react';
import { UserRole, Permission, hasPermission } from '../types/roles';
import { AuthContext } from '../contexts/AuthContext';

/**
 * Hook للوصول إلى صلاحيات المستخدم الحالي
 */
export function usePermissions() {
  const { user } = useContext(AuthContext);
  
  return useMemo(() => ({
    /**
     * التحقق من صلاحية محددة
     */
    can: (permission: Permission): boolean => {
      if (!user) return false;
      return hasPermission(user.role, permission);
    },
    
    /**
     * التحقق من أي من الصلاحيات
     */
    canAny: (permissions: Permission[]): boolean => {
      if (!user) return false;
      return permissions.some(p => hasPermission(user.role, p));
    },
    
    /**
     * التحقق من جميع الصلاحيات
     */
    canAll: (permissions: Permission[]): boolean => {
      if (!user) return false;
      return permissions.every(p => hasPermission(user.role, p));
    },
    
    /**
     * التحقق من دور معين
     */
    isRole: (role: UserRole): boolean => {
      return user?.role === role;
    },
    
    /**
     * التحقق من أي من الأدوار
     */
    isAnyRole: (roles: UserRole[]): boolean => {
      return roles.includes(user?.role as UserRole);
    },
    
    /**
     * دور المستخدم الحالي
     */
    role: user?.role,
    
    /**
     * هل المستخدم مسجل دخول؟
     */
    isAuthenticated: !!user
  }), [user]);
}
