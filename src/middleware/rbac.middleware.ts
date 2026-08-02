import { Request, Response, NextFunction } from 'express';
import { UserRole, Permission, hasPermission } from '../types/roles';

// توسيع نوع Request لإضافة user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/**
 * Middleware للتحقق من صلاحية محددة
 * @param permission الصلاحية المطلوبة
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح - الرجاء تسجيل الدخول',
        code: 'UNAUTHORIZED'
      });
    }
    
    if (!hasPermission(user.role, permission)) {
      return res.status(403).json({
        success: false,
        error: 'صلاحية غير كافية - لا تملك الصلاحية المطلوبة',
        code: 'FORBIDDEN',
        required: permission,
        userRole: user.role
      });
    }
    
    next();
  };
}

/**
 * Middleware للتحقق من أي من الصلاحيات المطلوبة
 * @param permissions قائمة الصلاحيات (يكفي وجود واحدة)
 */
export function requireAnyPermission(permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح - الرجاء تسجيل الدخول',
        code: 'UNAUTHORIZED'
      });
    }
    
    const hasAny = permissions.some(p => hasPermission(user.role, p));
    
    if (!hasAny) {
      return res.status(403).json({
        success: false,
        error: 'صلاحية غير كافية - لا تملك أي من الصلاحيات المطلوبة',
        code: 'FORBIDDEN',
        required: permissions,
        userRole: user.role
      });
    }
    
    next();
  };
}

/**
 * Middleware للتحقق من دور معين
 * @param roles قائمة الأدوار المسموح بها
 */
export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح - الرجاء تسجيل الدخول',
        code: 'UNAUTHORIZED'
      });
    }
    
    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: `هذا المسار مخصص للأدوار: ${roles.join(', ')}`,
        code: 'FORBIDDEN',
        required: roles,
        userRole: user.role
      });
    }
    
    next();
  };
}

/**
 * Middleware لتسجيل نشاط المستخدم
 */
export function logUserActivity(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  const startTime = Date.now();
  
  // تسجيل بداية الطلب
  console.log(`[${new Date().toISOString()}] 📝 ${user?.name || 'مجهول'} -> ${req.method} ${req.path}`);
  
  // عند الانتهاء، سجل المدة
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ✅ ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
}
