import { Router } from 'express';
import {
  getDashboardSummary,
  getAdvancedDashboard,
  getRoleDashboard,
  getActivityDashboard,
  getSystemStatus
} from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = Router();

// Secure all dashboard routes
router.use(authenticate);
router.use(cacheMiddleware({ ttl: 30 }));

// GET /api/dashboard - الملخص الأساسي للوحة التحكم
router.get('/', getDashboardSummary);

// GET /api/dashboard/system-status - مراقبة النظام لحظياً
router.get('/system-status', getSystemStatus);

// GET /api/dashboard/advanced - تفاصيل لوحة التحكم المتقدمة والرسوم البيانية والتحليلات
router.get('/advanced', getAdvancedDashboard);

// GET /api/dashboard/activity - لوحة تحكم مخصصة لنشاط الشركة (نقل، تصنيع، إلخ)
router.get('/activity', getActivityDashboard);

// GET /api/dashboard/:role - لوحة تحكم مخصصة حسب دور المستخدم (مدير، محاسب، إلخ)
router.get('/:role', getRoleDashboard);

export default router;
