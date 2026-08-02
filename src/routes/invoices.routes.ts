import { Router } from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
  getEtaSettings,
  saveEtaSettings,
  generateQrCode,
  getInvoiceXml,
  submitEta
} from '../controllers/invoices.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { validate } from '../middleware/validation.middleware';
import { createInvoiceSchema, updateInvoiceSchema } from '../validations/invoices.validation';

const router = Router();

// Protect all invoice endpoints with authentication
router.use(authenticate);

// ETA Settings Routes
router.get('/eta-settings', requirePermission('invoices', 'view'), getEtaSettings);
router.post('/eta-settings', authorize('admin', 'manager'), requirePermission('invoices', 'edit'), saveEtaSettings);

// GET /api/invoices - جلب جميع الفواتير
router.get('/', authorize('admin', 'manager', 'accountant', 'sales'), requirePermission('invoices', 'view'), getInvoices);

// GET /api/invoices/:id - جلب فاتورة بالمعرف
router.get('/:id', authorize('admin', 'manager', 'accountant', 'sales'), requirePermission('invoices', 'view'), getInvoiceById);

// POST /api/invoices - إضافة فاتورة جديدة
router.post('/', authorize('admin', 'manager', 'sales'), requirePermission('invoices', 'edit'), validate(createInvoiceSchema), createInvoice);

// PUT /api/invoices/:id - تحديث فاتورة
router.put('/:id', authorize('admin', 'manager', 'sales'), requirePermission('invoices', 'edit'), validate(updateInvoiceSchema), updateInvoice);

// DELETE /api/invoices/:id - حذف فاتورة
router.delete('/:id', authorize('admin', 'manager'), requirePermission('invoices', 'delete'), deleteInvoice);

// PATCH /api/invoices/:id/status - تحديث حالة الفاتورة
router.patch('/:id/status', authorize('admin', 'manager', 'sales'), requirePermission('invoices', 'edit'), updateInvoiceStatus);
router.put('/:id/status', authorize('admin', 'manager', 'sales'), requirePermission('invoices', 'edit'), updateInvoiceStatus);

// ETA Action Routes
router.post('/:id/generate-qr', generateQrCode);
router.get('/:id/xml', getInvoiceXml);
router.post('/:id/submit-eta', authorize('admin', 'manager'), submitEta);

export default router;
