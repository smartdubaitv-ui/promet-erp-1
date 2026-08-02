import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export interface CacheMiddlewareOptions {
  ttl?: number;
  methods?: string[];
  skip?: (req: Request) => boolean;
}

export const cacheMiddleware = (options: CacheMiddlewareOptions = {}) => {
  const ttl = options.ttl || 300;
  const methods = options.methods || ['GET'];
  const skip = options.skip || (() => false);

  return (req: any, res: any, next: NextFunction) => {
    // لو req.method !== 'GET' اعمل cache.flushAll() واستمر
    if (req.method !== 'GET') {
      cache.flushAll();
      return next();
    }

    // لو الميثود مش GET أو skip(req) صح، كمّل من غير كاش
    if (!methods.includes(req.method) || skip(req)) {
      return next();
    }

    // لو !req.tenantId || !req.user، ارجع next() من غير أي كاش (تخزين أو قراءة)
    if (!req.tenantId || !req.user) {
      return next();
    }

    // لو الاتنين موجودين، اعمل مفتاح الكاش بالشكل ده
    const userId = req.user.id || req.user.userId || 'unknown';
    const key = `${req.tenantId}:${userId}:${req.originalUrl || req.url}`;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    const originalJson = res.json;
    res.json = function (data: any) {
      cache.set(key, data, ttl);
      return originalJson.call(res, data);
    };

    next();
  };
};

export default cacheMiddleware;
