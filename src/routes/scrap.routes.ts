import { Router } from 'express';
import {
  getMaterials,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  getInventory,
  deleteScrapInventory,
  createScrapPurchase,
  processScrapSorting,
  getTransactions,
  updateScrapTransaction,
  deleteScrapTransaction,
  getCommissions,
  updateCommission,
  deleteCommission,
  getReportsSummary
} from '../controllers/scrap.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Secure all scrap routes
router.use(authenticate);

// GET /api/scrap/materials - جلب جميع أنواع المواد الخردة
router.get('/materials', authorize('admin', 'manager', 'warehouse', 'accountant'), getMaterials);

// POST /api/scrap/materials/add - إضافة نوع مادة خردة جديدة
router.post('/materials/add', authorize('admin', 'manager', 'warehouse', 'accountant'), addMaterial);

// PUT /api/scrap/materials/:id - تعديل صنف خردة
router.put('/materials/:id', authorize('admin', 'manager', 'warehouse', 'accountant'), updateMaterial);

// DELETE /api/scrap/materials/:id - حذف صنف خردة
router.delete('/materials/:id', authorize('admin', 'manager', 'warehouse', 'accountant'), deleteMaterial);

// GET /api/scrap/inventory - جرد مخزون الخردة الحالي
router.get('/inventory', authorize('admin', 'manager', 'warehouse', 'accountant'), getInventory);

// DELETE /api/scrap/inventory/:id - حذف دفعة خردة بالمستودع
router.delete('/inventory/:id', authorize('admin', 'manager', 'warehouse', 'accountant'), deleteScrapInventory);

// POST /api/scrap/inventory/add - توزين وتسجيل خردة بميزان البسكول
router.post('/inventory/add', authorize('admin', 'manager', 'warehouse', 'accountant'), createScrapPurchase);

// POST /api/scrap/sorting/process - الفرز والتصنيف والتجميع العكسي
router.post('/sorting/process', authorize('admin', 'manager', 'warehouse', 'accountant'), processScrapSorting);

// GET /api/scrap/transactions - سجل حركات الخردة
router.get('/transactions', authorize('admin', 'manager', 'warehouse', 'accountant'), getTransactions);

// PUT /api/scrap/transactions/:id - تعديل كارتة ميزان خردة
router.put('/transactions/:id', authorize('admin', 'manager', 'warehouse', 'accountant'), updateScrapTransaction);

// DELETE /api/scrap/transactions/:id - حذف كارتة ميزان خردة
router.delete('/transactions/:id', authorize('admin', 'manager', 'warehouse', 'accountant'), deleteScrapTransaction);

// GET /api/scrap/commissions - سجل عمولات السمسارة والوسطاء
router.get('/commissions', authorize('admin', 'manager', 'warehouse', 'accountant'), getCommissions);

// PUT /api/scrap/commissions/:id - تعديل عمولة سمسار
router.put('/commissions/:id', authorize('admin', 'manager', 'warehouse', 'accountant'), updateCommission);

// DELETE /api/scrap/commissions/:id - حذف عمولة سمسار
router.delete('/commissions/:id', authorize('admin', 'manager', 'warehouse', 'accountant'), deleteCommission);

// GET /api/scrap/reports/summary - ملخص إحصائيات تقرير الخردة
router.get('/reports/summary', authorize('admin', 'manager', 'warehouse', 'accountant'), getReportsSummary);

export default router;


