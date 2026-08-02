import { Application } from 'express';
import { logger } from '../config/logger';

// استيراد جميع المسارات الموديلية
import authRouter from './auth.routes';
import invoicesRouter from './invoices.routes';
import payrollRouter from './payroll.routes';
import inventoryRouter from './inventory.routes';
import employeesRouter from './employees.routes';
import reportsRouter from './reports.routes';
import dashboardRouter from './dashboard.routes';
import scrapRouter from './scrap.routes';
import shippingRouter from './shipping.routes';
import backupRouter from './backup.routes';
import crmRouter from './crm.routes';
import anomalyRouter from './anomaly.routes';
import miscRouter from './misc.routes';
import approvalsRouter from './approvals.routes';
import recurringInvoicesRouter from './recurring-invoices.routes';
import enterpriseRouter from './enterprise.routes';
import assetsRouter from './assets.routes';
import treasuryRouter from './treasury.routes';
import auditRouter from './audit.routes';
import projectsRouter from './projects.routes';
import advancesRouter from './advances.routes';
import userPermissionsRouter from './user-permissions.routes';

// ============================================================
// 1. تسجيل جميع المسارات
// ============================================================

export const setupRoutes = (app: Application) => {
  // المصادقة
  app.use('/api/auth', authRouter);
  
  // الموافقات والاعتمادات
  app.use('/api/approvals', approvalsRouter);

  // الفواتير الدورية
  app.use('/api/recurring-invoices', recurringInvoicesRouter);
  
  // الموظفين
  app.use('/api/employees', employeesRouter);
  
  // المخزون
  app.use('/api/inventory', inventoryRouter);
  
  // الفواتير
  app.use('/api/invoices', invoicesRouter);
  
  // الرواتب
  app.use('/api/payroll', payrollRouter);
  
  // التقارير
  app.use('/api/reports', reportsRouter);
  
  // لوحة القيادة
  app.use('/api/dashboard', dashboardRouter);
  
  // الخردة
  app.use('/api/scrap', scrapRouter);
  
  // الشحن
  app.use('/api/shipping', shippingRouter);
  
  // النسخ الاحتياطي (الإدارة)
  app.use('/api/admin', backupRouter);
  app.use('/api/backup', backupRouter); // لدعم كلي المسارين
  
  // إدارة العلاقات CRM
  app.use('/api/crm', crmRouter);
  
  // كشف الشذوذ والذكاء الاصطناعي
  app.use('/api/anomaly', anomalyRouter);

  // البنية التحتية والامتثال والمستندات الذكية للمؤسسات الكبرى
  app.use('/api/enterprise', enterpriseRouter);
  
  // الأصول الثابتة
  app.use('/api/assets', assetsRouter);
  app.use('/api/asset-categories', assetsRouter);
  
  // إدارة الخزينة متعددة الخزائن
  app.use('/api/treasury', treasuryRouter);

  // سجل الرقابة والتدقيق وإغلاق الدورات
  app.use('/api/audit', auditRouter);
  app.use('/api/closing', auditRouter);
  
  // إدارة المشاريع والمقاولات
  app.use('/api/projects', projectsRouter);
  
  // السلف وإقراض الموظفين
  app.use('/api/advances', advancesRouter);
  app.use('/api/employee-advances', advancesRouter);
  
  // إدارة صلاحيات المستخدمين المخصصة
  app.use('/api/user-permissions', userPermissionsRouter);
  
  // مسارات متنوعة ومتعددة
  app.use('/api', miscRouter);
  
  // ============================================================
  // 1.2 مسار غير موجود (404) - معالجة نهائية لـ API
  // ============================================================
  
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'المسار المطلوب غير موجود في واجهة برمجة التطبيقات (API)',
      path: req.originalUrl || req.path,
    });
  });
  
  logger.info('✅ All modular API routes registered successfully');
};

export default setupRoutes;
