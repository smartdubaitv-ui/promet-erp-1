import { Router } from 'express';
import {
  getFinancials,
  getTrialBalance,
  getProfitLoss,
  getBalanceSheet,
  getCashFlow,
  getGeneralLedger,
  getTaxReport,
  getAgingReceivable,
  getAgingPayable,
  getSalesAnalytics,
  getEmployeesPerformance,
  getInventoryAnalytics,
  saveReport,
  getSavedReports,
  getActivityReport,
  exportReportsToExcel
} from '../controllers/reports.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Secure all reports routes
router.use(authenticate);

// GET /api/reports/export/excel - تصدير التقارير إلى Excel
router.get('/export/excel', authorize('admin', 'manager', 'hr'), exportReportsToExcel);

// GET /api/reports/financials - الملخص المالي
router.get('/financials', authorize('admin', 'manager', 'hr'), getFinancials);

// GET /api/reports/trial-balance - ميزان المراجعة
router.get('/trial-balance', authorize('admin', 'manager', 'hr'), getTrialBalance);

// GET /api/reports/profit-loss - قائمة الدخل
router.get('/profit-loss', authorize('admin', 'manager', 'hr'), getProfitLoss);

// GET /api/reports/balance-sheet - الميزانية العمومية
router.get('/balance-sheet', authorize('admin', 'manager', 'hr'), getBalanceSheet);

// GET /api/reports/cash-flow - التدفقات النقدية
router.get('/cash-flow', authorize('admin', 'manager', 'hr'), getCashFlow);

// GET /api/reports/general-ledger - دفتر الأستاذ العام
router.get('/general-ledger', authorize('admin', 'manager', 'hr'), getGeneralLedger);

// GET /api/reports/tax - الإقرار الضريبي
router.get('/tax', authorize('admin', 'manager', 'hr'), getTaxReport);

// GET /api/reports/aging-receivable - أعمار ديون العملاء
router.get('/aging-receivable', getAgingReceivable);

// GET /api/reports/aging-payable - أعمار ديون الموردين
router.get('/aging-payable', getAgingPayable);

// GET /api/reports/sales/analytics - تحليلات المبيعات
router.get('/sales/analytics', getSalesAnalytics);

// GET /api/reports/employees/performance - أداء الموظفين
router.get('/employees/performance', getEmployeesPerformance);

// GET /api/reports/inventory/analytics - تحليلات المخزون
router.get('/inventory/analytics', getInventoryAnalytics);

// POST /api/reports/save - حفظ تقرير مخصص
router.post('/save', saveReport);

// GET /api/reports/saved - جلب التقارير المحفوظة
router.get('/saved', getSavedReports);

// GET /api/reports/activity - تقرير النشاط للشركة
router.get('/activity', getActivityReport);

export default router;
