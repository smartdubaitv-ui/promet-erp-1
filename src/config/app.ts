import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { helmetConfig } from './helmet';
import { corsConfig } from './cors';
import { logger } from './logger';
import { tenantMiddleware } from '../middleware/tenant.middleware';

// ============================================================
// 1. إعدادات الـ Rate Limiting
// ============================================================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 600, // زيادة الحد الأقصى لتفادي حظر المطورين والمستخدمين أثناء المعاينة
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  skip: (req: Request) => {
    // تخطي الـ Rate Limit للمسارات الداخلية أو في حالة بيئة التطوير
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return req.path === '/health' || req.path === '/api/health';
  },
});

// ============================================================
// 2. مسارات السماح (Whitelist)
// ============================================================

const publicPaths = [
  '/health',
  '/api/health',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/docs',
  '/api-docs',
];

// ============================================================
// 3. تهيئة التطبيق
// ============================================================

export const setupApp = (): Application => {
  const app = express();
  
  // ============================================================
  // 3.1 الأمان الأساسي
  // ============================================================
  
  // Helmet - حماية الرؤوس HTTP
  app.use(helmet(helmetConfig));
  
  // CORS
  app.use(cors(corsConfig));
  
  // Compression - ضغط الردود
  app.use(compression());
  
  // Rate Limiting
  app.use(limiter);
  
  // ============================================================
  // 3.2 تحليل الجسم (Body Parsing)
  // ============================================================
  
  // JSON مع حد أقصى للحجم
  app.use(express.json({ 
    limit: '15mb',
  }));
  
  // URL Encoded
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '15mb' 
  }));
  

  // ============================================================
  // 3.4 الميدل وير المخصص
  // ============================================================
  
  // تسجيل الطلبات (للتطوير)
  if (process.env.NODE_ENV !== 'production') {
    app.use((req: Request, res: Response, next: NextFunction) => {
      logger.debug(`📝 ${req.method} ${req.path}`);
      next();
    });
  }
  
  // Tenants
  app.use(tenantMiddleware);
  
  // ============================================================
  // 3.5 المسارات العامة
  // ============================================================
  
  // التحقق من صحة الخادم
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    });
  });
  
  return app;
};

export default setupApp;
