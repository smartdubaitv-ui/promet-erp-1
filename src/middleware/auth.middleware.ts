import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from '../config/logger';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      tenantId?: string;
    }
  }
}

// Global container to persist generated secrets in production if not set in process.env
const globalAny: any = global;

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('❌ CRITICAL ERROR: JWT_SECRET environment variable is missing in production environment! Fail-Fast active.');
      process.exit(1);
    }
    return 'development_default_secure_key_promet_1234567890';
  }
  return secret;
};

export const getJwtRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('❌ CRITICAL ERROR: JWT_REFRESH_SECRET environment variable is missing in production environment! Fail-Fast active.');
      process.exit(1);
    }
    return 'development_default_secure_refresh_key_promet_1234567890';
  }
  return secret;
};

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    let token = req.headers.authorization?.split(' ')[1];
    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    if (!token && process.env.LOCAL_TEST_MODE === 'true') {
      req.user = {
        id: 'u-1',
        email: 'admin@promet.sa',
        role: 'admin',
        tenantId: 'tenant-promet-sa',
        name: 'مستخدم تجريبي محلي',
      };
      req.tenantId = 'tenant-promet-sa';
      return next();
    }

    if (!token) {
      return res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (e) {
      return res.status(401).json({ error: 'توكن غير صالح' });
    }

    if (!decoded || typeof decoded !== 'object' || !(decoded.id || decoded.userId)) {
      return res.status(401).json({ error: 'غير مصرح: لا توجد بيانات مستخدم صحيحة' });
    }

    req.user = decoded;
    const tenantId = decoded.tenantId || decoded.tenant_id || 'tenant-promet-sa';
    req.tenantId = tenantId;
    req.user.tenantId = tenantId;
    req.user.tenant_id = tenantId;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'توكن غير صالح' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'غير مصرح' });
    }

    const userRole = String(req.user.role || '').toLowerCase();
    const authorizedRoles = roles.map(r => r.toLowerCase());

    if (!authorizedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'غير مسموح: لا تملك الصلاحية المطلوبة' });
    }

    next();
  };
};
