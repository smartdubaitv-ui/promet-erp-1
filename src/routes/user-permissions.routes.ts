import { Router } from 'express';
import {
  getUserPermissions,
  updateUserPermissions,
  getAllUsersPermissions
} from '../controllers/user-permissions.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// حماية المسارات برمز المصادقة ودور المدير (admin)
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/user-permissions - جلب قائمة كل المستخدمين مع صلاحياتهم
router.get('/', getAllUsersPermissions);

// GET /api/user-permissions/:userId - جلب الصلاحيات لمستخدم معين
router.get('/:userId', getUserPermissions);

// PUT /api/user-permissions/:userId - حفظ وتحديث صلاحيات مستخدم معين
router.put('/:userId', updateUserPermissions);

export default router;
