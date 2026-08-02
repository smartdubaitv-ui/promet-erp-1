import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from './auth.middleware';
import { logger } from '../config/logger';
import { tenantStorage } from '../data/jsonDatabase';

declare global {
  namespace Express {
    interface Request {
      user?: any;
      tenantId?: string;
    }
  }
}

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1] || (req.query.token as string);
  let tenantId = 'tenant-promet-sa'; // Default tenant
  let isTokenValid = false;

  if (token) {
    try {
      const decoded: any = jwt.verify(token, getJwtSecret());
      req.user = decoded;
      tenantId = decoded.tenant_id || decoded.tenantId || tenantId;
      isTokenValid = true;
    } catch (error) {
      // Ignore token verification errors to let the request proceed with x-tenant-id or default
    }
  }

  const headerTenantId = req.headers['x-tenant-id'] || req.query.tenantId;
  if (headerTenantId && typeof headerTenantId === 'string') {
    const sanitizedTenantId = headerTenantId.trim().replace(/[^a-zA-Z0-9_\-]/g, '');
    
    if (isTokenValid) {
      // Tenant spoofing check and strict enforcement
      const tokenTenant = req.user?.tenant_id || req.user?.tenantId;
      if (tokenTenant && String(tokenTenant) !== String(headerTenantId)) {
        logger.warn(`🚨 [SECURITY ATTEMPT] Tenant spoofing blocked: Authenticated user (${req.user?.email}) with tenant ${tokenTenant} requested tenant ${headerTenantId}. Strictly enforcing token tenant.`);
        tenantId = tokenTenant;
      } else {
        tenantId = tokenTenant || tenantId;
      }
    } else {
      tenantId = sanitizedTenantId || tenantId;
    }
  }

  // Ensure tenantId has safe characters
  tenantId = tenantId.replace(/[^a-zA-Z0-9_\-]/g, '');
  if (!tenantId) {
    tenantId = 'tenant-promet-sa';
  }

  req.tenantId = tenantId;
  if (req.user) {
    req.user.tenantId = tenantId;
    req.user.tenant_id = tenantId;
  }

  // Bind the AsyncLocalStorage context for dynamic database sharding
  tenantStorage.run(tenantId, () => {
    next();
  });
};

