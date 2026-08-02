/**
 * أدوار المستخدمين في النظام
 */
export enum UserRole {
  ADMIN = 'ADMIN',           // صاحب الشركة - صلاحية كاملة
  MANAGER = 'MANAGER',       // مدير عام
  ACCOUNTANT = 'ACCOUNTANT', // مدير حسابات
  WAREHOUSE = 'WAREHOUSE',   // مدير مخازن
  EMPLOYEE = 'EMPLOYEE'      // موظف عادي
}

/**
 * الصلاحيات المتاحة في النظام
 */
export enum Permission {
  // الصلاحيات العامة
  VIEW_DASHBOARD = 'view_dashboard',
  
  // الصلاحيات المالية
  VIEW_FINANCIAL = 'view_financial',
  CREATE_INVOICE = 'create_invoice',
  APPROVE_INVOICE = 'approve_invoice',
  VIEW_TRANSACTIONS = 'view_transactions',
  VIEW_TAX_REPORTS = 'view_tax_reports',
  
  // صلاحيات المخزون
  VIEW_INVENTORY = 'view_inventory',
  MANAGE_STOCK = 'manage_stock',
  CREATE_PURCHASE_ORDER = 'create_purchase_order',
  APPROVE_PURCHASE_ORDER = 'approve_purchase_order',
  
  // صلاحيات إدارة المستخدمين
  VIEW_USERS = 'view_users',
  CREATE_USER = 'create_user',
  EDIT_USER = 'edit_user',
  DELETE_USER = 'delete_user',
  MANAGE_ROLES = 'manage_roles',
  
  // صلاحيات التقارير
  VIEW_REPORTS = 'view_reports',
  VIEW_EMPLOYEE_REPORTS = 'view_employee_reports',
  VIEW_SALES_REPORTS = 'view_sales_reports',
  
  // صلاحيات الموظفين
  VIEW_OWN_PROFILE = 'view_own_profile',
  EDIT_OWN_PROFILE = 'edit_own_profile',
  CREATE_REQUEST = 'create_request'
}

/**
 * تعريف صلاحيات كل دور
 */
export const RolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // صاحب الشركة - كل الصلاحيات
    ...Object.values(Permission)
  ],
  
  [UserRole.MANAGER]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_FINANCIAL,
    Permission.VIEW_TRANSACTIONS,
    Permission.VIEW_REPORTS,
    Permission.VIEW_SALES_REPORTS,
    Permission.VIEW_EMPLOYEE_REPORTS,
    Permission.VIEW_INVENTORY,
    Permission.VIEW_USERS,
    Permission.APPROVE_INVOICE,
    Permission.APPROVE_PURCHASE_ORDER,
    Permission.VIEW_OWN_PROFILE,
    Permission.EDIT_OWN_PROFILE
  ],
  
  [UserRole.ACCOUNTANT]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_FINANCIAL,
    Permission.CREATE_INVOICE,
    Permission.VIEW_TRANSACTIONS,
    Permission.VIEW_TAX_REPORTS,
    Permission.VIEW_REPORTS,
    Permission.VIEW_OWN_PROFILE,
    Permission.EDIT_OWN_PROFILE
  ],
  
  [UserRole.WAREHOUSE]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_INVENTORY,
    Permission.MANAGE_STOCK,
    Permission.CREATE_PURCHASE_ORDER,
    Permission.VIEW_OWN_PROFILE,
    Permission.EDIT_OWN_PROFILE
  ],
  
  [UserRole.EMPLOYEE]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_OWN_PROFILE,
    Permission.EDIT_OWN_PROFILE,
    Permission.CREATE_REQUEST
  ]
};

/**
 * التحقق من وجود صلاحية معينة
 */
export function hasPermission(
  userRole: UserRole,
  permission: Permission
): boolean {
  const permissions = RolePermissions[userRole];
  return permissions?.includes(permission) || false;
}

/**
 * التحقق من وجود أي من الصلاحيات المطلوبة
 */
export function hasAnyPermission(
  userRole: UserRole,
  permissions: Permission[]
): boolean {
  const userPermissions = RolePermissions[userRole];
  return permissions.some(p => userPermissions?.includes(p));
}

/**
 * التحقق من وجود جميع الصلاحيات المطلوبة
 */
export function hasAllPermissions(
  userRole: UserRole,
  permissions: Permission[]
): boolean {
  const userPermissions = RolePermissions[userRole];
  return permissions.every(p => userPermissions?.includes(p));
}
