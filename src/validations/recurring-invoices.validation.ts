import { z } from 'zod';

export const createRecurringInvoiceSchema = z.object({
  body: z.object({
    contactId: z.string().min(1, 'معرف جهة الاتصال مطلوب'),
    contactName: z.string().optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    nextExecutionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ التنفيذ القادم غير صالح، الصيغة المتوقعة YYYY-MM-DD'),
    isActive: z.boolean().default(true),
    notes: z.string().optional(),
    lines: z.array(z.object({
      productId: z.string().optional(),
      description: z.string().min(1, 'الوصف مطلوب للسطر'),
      quantity: z.number().positive('الكمية يجب أن تكون أكبر من الصفر'),
      unitPrice: z.number().nonnegative('سعر الوحدة لا يمكن أن يكون سالباً')
    })).min(1, 'يجب إدراج بند مالي واحد على الأقل في الفاتورة الدورية')
  })
});

export const updateRecurringInvoiceSchema = z.object({
  body: z.object({
    contactId: z.string().min(1, 'معرف جهة الاتصال مطلوب').optional(),
    contactName: z.string().optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
    nextExecutionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ التنفيذ القادم غير صالح، الصيغة المتوقعة YYYY-MM-DD').optional(),
    isActive: z.boolean().optional(),
    notes: z.string().optional(),
    lines: z.array(z.object({
      productId: z.string().optional(),
      description: z.string().min(1, 'الوصف مطلوب للسطر'),
      quantity: z.number().positive('الكمية يجب أن تكون أكبر من الصفر'),
      unitPrice: z.number().nonnegative('سعر الوحدة لا يمكن أن يكون سالباً')
    })).min(1, 'يجب إدراج بند مالي واحد على الأقل في الفاتورة الدورية').optional()
  })
});
export default createRecurringInvoiceSchema;
