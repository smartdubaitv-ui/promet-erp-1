import { Router } from 'express';
import {
  getPayroll,
  calculatePayroll,
  approvePayroll,
  approveAllPayroll,
  createPayroll,
  updatePayroll,
  deletePayroll,
  postPayroll
} from '../controllers/payroll.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

// Secure all payroll routes
router.use(authenticate);

// Calculations & Approval Routes - Restrict to admin, manager, hr
router.post('/calculate', authorize('admin', 'manager', 'hr'), requirePermission('payroll', 'edit'), calculatePayroll);
router.put('/approve-all', authorize('admin', 'manager', 'hr'), requirePermission('payroll', 'edit'), approveAllPayroll);
router.post('/post', authorize('admin', 'manager', 'hr'), requirePermission('payroll', 'edit'), postPayroll);

// CRUD Routes
router.get('/', requirePermission('payroll', 'view'), getPayroll); // All authenticated users can view their payroll list
router.post('/', authorize('admin', 'manager', 'hr'), requirePermission('payroll', 'edit'), createPayroll);
router.put('/:id', authorize('admin', 'manager', 'hr'), requirePermission('payroll', 'edit'), updatePayroll);
router.delete('/:id', authorize('admin', 'manager', 'hr'), requirePermission('payroll', 'delete'), deletePayroll);

// Individual approval
router.put('/:id/approve', authorize('admin', 'manager', 'hr'), requirePermission('payroll', 'edit'), approvePayroll);

export default router;
