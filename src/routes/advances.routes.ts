import { Router } from 'express';
import {
  createAdvance,
  approveAdvance,
  rejectAdvance,
  getAdvances,
  getAdvanceInstallments,
  markInstallmentPaidManually,
} from '../controllers/advances.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

// طلب سلفة جديد (HR/الأدمن/المدير)
router.post('/', authorize('admin', 'manager', 'hr'), createAdvance);

// عرض السلف (يمكن فلترتها بـ ?employeeId=&status=)
router.get('/', getAdvances);

// اعتماد / رفض السلفة
router.post('/:id/approve', authorize('admin', 'manager', 'hr'), approveAdvance);
router.post('/:id/reject', authorize('admin', 'manager', 'hr'), rejectAdvance);

// جدول أقساط سلفة معينة
router.get('/:id/installments', getAdvanceInstallments);

// تسجيل سداد قسط يدويًا (مثلاً الموظف دفع كاش)
router.post('/installments/:id/mark-paid', authorize('admin', 'manager', 'hr'), markInstallmentPaidManually);
router.post('/installments/:id/pay-manually', authorize('admin', 'manager', 'hr'), markInstallmentPaidManually);
router.put('/installments/:id/pay-manually', authorize('admin', 'manager', 'hr'), markInstallmentPaidManually);

export default router;

