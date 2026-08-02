import { firestore, isFirebaseConnected } from './firebase.service';
import { jsonDB } from '../data/jsonDatabase';
import { logger } from '../config/logger';

export interface ModulePermissions {
  view: boolean;
  edit: boolean;
  delete: boolean;
}

export interface UserPermissions {
  id: string;
  tenantId: string;
  userId: string;
  permissions: {
    [module: string]: ModulePermissions;
  };
  updatedAt: string;
  updatedBy: string;
}

export const INITIAL_MODULE_KEYS = [
  'invoices',
  'employees',
  'payroll',
  'treasury',
  'advances',
  'scrap',
  'inventory',
  'recurring_invoices',
  'approvals',
  'reports',
  'backup',
  'settings'
];

export const getDefaultPermissionsForRole = (role: string = '') => {
  const normalizedRole = role.toLowerCase();
  const isAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin';

  const permissions: { [module: string]: ModulePermissions } = {};
  for (const moduleKey of INITIAL_MODULE_KEYS) {
    permissions[moduleKey] = {
      view: true,
      edit: isAdmin,
      delete: isAdmin
    };
  }
  return permissions;
};

/**
 * جلب الصلاحيات الفعلية للمستخدم
 */
export async function getEffectivePermissions(
  tenantId: string = 'tenant-promet-sa',
  userId: string,
  userRole: string = 'employee'
): Promise<{ [module: string]: ModulePermissions }> {
  const defaultPerms = getDefaultPermissionsForRole(userRole);

  if (!userId) {
    return defaultPerms;
  }

  try {
    // 1. محاولة الجلب من Firebase
    if (isFirebaseConnected() && firestore) {
      const snap = await (firestore as any)
        .collection('user_permissions')
        .where('userId', '==', userId)
        .where('tenantId', '==', tenantId)
        .get();

      if (!snap.empty) {
        const docData = snap.docs[0].data() as UserPermissions;
        if (docData && docData.permissions) {
          return mergeWithDefaults(docData.permissions, defaultPerms);
        }
      }
    }

    // 2. محاولة الجلب من قاعدة البيانات المحلية JSON
    const localRecord = jsonDB.findOne<UserPermissions>('user_permissions', (item) => {
      return item.userId === userId && (item.tenantId === tenantId || !item.tenantId);
    });

    if (localRecord && localRecord.permissions) {
      return mergeWithDefaults(localRecord.permissions, defaultPerms);
    }
  } catch (err) {
    logger.error(`Error fetching user permissions for userId=${userId}:`, err);
  }

  return defaultPerms;
}

/**
 * دمج الصلاحيات المخزنة مع أي موديلات جديدة تظهر مستقبلاً
 */
function mergeWithDefaults(
  stored: { [module: string]: ModulePermissions },
  defaults: { [module: string]: ModulePermissions }
): { [module: string]: ModulePermissions } {
  const result: { [module: string]: ModulePermissions } = { ...defaults };
  for (const key of Object.keys(stored)) {
    result[key] = {
      view: Boolean(stored[key]?.view),
      edit: Boolean(stored[key]?.edit),
      delete: Boolean(stored[key]?.delete)
    };
  }
  return result;
}

/**
 * التحقق من صلاحية مستخدم في قسم ووظيفة معينة
 */
export async function checkPermission(
  tenantId: string = 'tenant-promet-sa',
  userId: string,
  userRole: string = '',
  moduleName: string,
  action: 'view' | 'edit' | 'delete'
): Promise<boolean> {
  // دور admin يتجاوز جميع الفحوصات دائماً
  if (userRole && (userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'superadmin')) {
    return true;
  }

  const effectivePermissions = await getEffectivePermissions(tenantId, userId, userRole);
  const modulePerms = effectivePermissions[moduleName];

  if (!modulePerms) {
    // إذا كان الموديل غير معرف، يسمح بالعرض كافتراضي آمن
    return action === 'view';
  }

  return Boolean(modulePerms[action]);
}

/**
 * حفظ وتحديث صلاحيات مستخدم مخصصة
 */
export async function setUserPermissions(
  tenantId: string = 'tenant-promet-sa',
  userId: string,
  permissions: { [module: string]: ModulePermissions },
  updatedBy: string = 'admin'
): Promise<UserPermissions> {
  const now = new Date().toISOString();
  const id = `perm-${userId}`;

  const record: UserPermissions = {
    id,
    tenantId,
    userId,
    permissions,
    updatedAt: now,
    updatedBy
  };

  // 1. الحفظ في Firebase إذا كان متصلاً
  if (isFirebaseConnected() && firestore) {
    try {
      await (firestore as any).collection('user_permissions').doc(id).set(record, { merge: true });
    } catch (err) {
      logger.error(`Error setting user permissions in Firebase for userId=${userId}:`, err);
    }
  }

  // 2. الحفظ في JSON Database المحلية
  const existing = jsonDB.findOne<UserPermissions>('user_permissions', item => item.userId === userId);
  if (existing) {
    jsonDB.update('user_permissions', existing.id, record);
  } else {
    jsonDB.insert('user_permissions', record);
  }

  return record;
}

export default {
  INITIAL_MODULE_KEYS,
  getDefaultPermissionsForRole,
  getEffectivePermissions,
  checkPermission,
  setUserPermissions
};
