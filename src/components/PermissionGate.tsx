import React, { ReactNode } from 'react';
import { Permission } from '../types/roles';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGateProps {
  permission?: Permission;
  permissions?: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
  showAdmin?: boolean;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  permissions = [],
  children,
  fallback = null,
  showAdmin = true
}) => {
  const { can, canAny, role, isAuthenticated } = usePermissions();
  
  if (!isAuthenticated) return null;
  
  if (showAdmin && role === 'ADMIN') {
    return <>{children}</>;
  }
  
  let hasAccess = false;
  
  if (permission) {
    hasAccess = can(permission);
  } else if (permissions.length > 0) {
    hasAccess = canAny(permissions);
  } else {
    hasAccess = true;
  }
  
  return hasAccess ? <>{children}</> : <>{fallback}</>;
};
