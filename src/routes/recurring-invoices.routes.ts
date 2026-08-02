import { Router } from 'express';
import {
  getRecurringInvoices,
  createRecurringInvoiceTemplate,
  updateRecurringInvoice,
  deleteRecurringInvoice
} from '../controllers/recurring-invoices.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createRecurringInvoiceSchema,
  updateRecurringInvoiceSchema
} from '../validations/recurring-invoices.validation';

const router = Router();

// حماية كافة المسارات بالمصادقة
router.use(authenticate);

// جلب قوالب الفواتير الدورية
router.get('/', getRecurringInvoices);

// إنشاء قالب فاتورة دورية جديدة
router.post(
  '/',
  authorize('admin', 'manager', 'sales'),
  validate(createRecurringInvoiceSchema),
  createRecurringInvoiceTemplate
);

// تحديث قالب فاتورة دورية قائمة
router.put(
  '/:id',
  authorize('admin', 'manager', 'sales'),
  validate(updateRecurringInvoiceSchema),
  updateRecurringInvoice
);

// حذف قالب فاتورة دورية
router.delete(
  '/:id',
  authorize('admin', 'manager'),
  deleteRecurringInvoice
);

export default router;
