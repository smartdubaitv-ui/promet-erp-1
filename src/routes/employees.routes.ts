import { Router } from 'express';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
} from '../controllers/employees.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

// Secure all employee endpoints
router.use(authenticate);

// GET /api/employees - جلب جميع الموظفين
router.get('/', requirePermission('employees', 'view'), getEmployees);

// GET /api/employees/:id - جلب موظف معين
router.get('/:id', requirePermission('employees', 'view'), getEmployeeById);

// POST /api/employees - إضافة موظف جديد
router.post('/', requirePermission('employees', 'edit'), createEmployee);

// PUT /api/employees/:id - تحديث موظف
router.put('/:id', requirePermission('employees', 'edit'), updateEmployee);

// DELETE /api/employees/:id - حذف موظف
router.delete('/:id', requirePermission('employees', 'delete'), deleteEmployee);

export default router;

