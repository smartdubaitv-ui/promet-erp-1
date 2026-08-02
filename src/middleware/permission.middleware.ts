import { Request, Response, NextFunction } from 'express';
import { checkPermission } from '../services/permission.service';

export const requirePermission = (module: string, action: 'view' | 'edit' | 'delete') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;
      const tenantId = (req as any).tenantId || 'tenant-promet-sa';

      if (!user) {
        return res.status(401).json({ error: 'غير مصرح' });
      }

      const userId = user.id || user.userId || user.uid;
      const userRole = user.role || '';

      const allowed = await checkPermission(tenantId, userId, userRole, module, action);
      if (!allowed) {
        return res.status(403).json({ error: `لا تملك صلاحية "${action}" في قسم "${module}"` });
      }

      return next();
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'خطأ أثناء التحقق من الصلاحيات' });
    }
  };
};

export default requirePermission;
