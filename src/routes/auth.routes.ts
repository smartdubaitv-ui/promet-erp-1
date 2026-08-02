import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, register, verifyToken, refresh } from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { loginSchema, registerSchema } from '../validations/auth.validation';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  skip: () => process.env.NODE_ENV !== 'production'
});

// POST /api/auth/login - تسجيل الدخول
router.post('/login', loginLimiter, validate(loginSchema), login);

// POST /api/auth/register - تسجيل مستخدم جديد
router.post('/register', validate(registerSchema), register);

// GET /api/auth/verify - التحقق من التوكن
router.get('/verify', verifyToken);

// POST /api/auth/refresh - تحديث التوكن
router.post('/refresh', refresh);

export default router;
