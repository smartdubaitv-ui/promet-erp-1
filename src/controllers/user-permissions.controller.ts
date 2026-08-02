import { Request, Response } from 'express';
import { jsonDB } from '../data/jsonDatabase';
import {
  getEffectivePermissions,
  setUserPermissions,
  INITIAL_MODULE_KEYS,
  getDefaultPermissionsForRole
} from '../services/permission.service';

/**
 * GET /api/user-permissions/:userId
 * جلب الصلاحيات الحالية لمستخدم معين
 */
export const getUserPermissions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const tenantId = (req as any).tenantId || 'tenant-promet-sa';

    if (!userId) {
      return res.status(400).json({ success: false, error: 'معرف المستخدم مطلوب' });
    }

    // ابحث عن المستخدم لمعرفة دوره الوظيفي
    const userObj = jsonDB.findOne<any>('users', u => u.id === userId || u.userId === userId) ||
                    jsonDB.findOne<any>('employees', e => e.id === userId);

    const userRole = userObj?.role || 'employee';
    const permissions = await getEffectivePermissions(tenantId, userId, userRole);

    return res.json({
      success: true,
      userId,
      role: userRole,
      permissions
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /api/user-permissions/:userId
 * حفظ وتحديث الصلاحيات المخصصة لمستخدم
 */
export const updateUserPermissions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const tenantId = (req as any).tenantId || 'tenant-promet-sa';
    const currentUser = (req as any).user;
    const { permissions } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'معرف المستخدم مطلوب' });
    }

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ success: false, error: 'كائن الصلاحيات غير صالح' });
    }

    const updatedBy = currentUser?.name || currentUser?.email || 'admin';
    const saved = await setUserPermissions(tenantId, userId, permissions, updatedBy);

    return res.json({
      success: true,
      message: 'تم حفظ وتحديث صلاحيات المستخدم بنجاح',
      data: saved
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/user-permissions
 * جلب جميع المستخدمين مع صلاحياتهم الحالية للعرض في الشاشة
 */
export const getAllUsersPermissions = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || 'tenant-promet-sa';

    // جلب قائمة المستخدمين والموظفين
    const rawUsers = jsonDB.find<any>('users', () => true);
    const rawEmployees = jsonDB.find<any>('employees', () => true);

    const usersMap = new Map<string, any>();

    rawUsers.forEach(u => {
      const uId = u.id || u.userId;
      if (uId) {
        usersMap.set(uId, {
          id: uId,
          name: u.name || u.email || uId,
          email: u.email || '',
          role: u.role || 'employee'
        });
      }
    });

    rawEmployees.forEach(e => {
      const eId = e.id;
      if (eId && !usersMap.has(eId)) {
        usersMap.set(eId, {
          id: eId,
          name: e.name || e.email || eId,
          email: e.email || '',
          role: e.role || e.position || 'employee'
        });
      }
    });

    const userList = Array.from(usersMap.values());
    const results = await Promise.all(
      userList.map(async u => {
        const perms = await getEffectivePermissions(tenantId, u.id, u.role);
        return {
          ...u,
          permissions: perms
        };
      })
    );

    return res.json({
      success: true,
      data: results,
      availableModules: INITIAL_MODULE_KEYS
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
