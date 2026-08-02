import { Router } from 'express';
import { getApprovals, submitApproval, approveRecord, rejectRecord } from '../controllers/approvals.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// جميع مسارات الاعتمادات تتطلب تسجيل الدخول
router.use(authenticate);

// GET /api/approvals - جلب طلبات الاعتماد
router.get('/', getApprovals);

// POST /api/approvals/submit - تقديم طلب اعتماد
router.post('/submit', submitApproval);

// POST /api/approvals/:id/approve - الموافقة على طلب الاعتماد
router.post('/:id/approve', approveRecord);

// POST /api/approvals/:id/reject - رفض طلب الاعتماد
router.post('/:id/reject', rejectRecord);

export default router;
