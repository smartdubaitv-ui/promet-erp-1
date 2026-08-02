import { CorsOptions } from 'cors';

// ============================================================
// 1. إعدادات CORS
// ============================================================

const isProduction = process.env.NODE_ENV === 'production';

// قائمة العناوين المسموح بها (للإنتاج)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    // السماح للطلبات بدون origin (مثل التطبيقات المحمولة)
    if (!origin) {
      return callback(null, true);
    }
    
    // في التطوير، السماح بكل الـ origins
    if (!isProduction) {
      return callback(null, true);
    }
    
    // في الإنتاج، التحقق من القائمة المسموح بها
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'x-tenant-id',
    'X-Tenant-ID',
  ],
  exposedHeaders: ['Content-Disposition', 'X-Total-Count'],
  maxAge: 86400, // 24 ساعة
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

export default corsConfig;
