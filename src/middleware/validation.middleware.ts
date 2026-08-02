import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';

export const validate = (schema: ZodType<any, any, any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue) => ({
          field: issue.path.slice(1).join('.') || issue.path.join('.'),
          message: issue.message,
        }));
        return res.status(400).json({
          error: 'خطأ في التحقق من صحة البيانات المدخلة',
          details: errorMessages,
        });
      }
      return res.status(500).json({ error: 'حدث خطأ داخلي أثناء التحقق من البيانات' });
    }
  };
};
