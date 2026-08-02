import { z } from 'zod';

export const createInvoiceSchema = z.object({
  body: z.object({
    contactId: z.string().min(1, 'معرف جهة الاتصال مطلوب'),
    invoiceNumber: z.string().min(1, 'رقم الفاتورة مطلوب'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ الفاتورة غير صالح، الصيغة المتوقعة YYYY-MM-DD'),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ الاستحقاق غير صالح، الصيغة المتوقعة YYYY-MM-DD'),
    lines: z.array(z.object({
      description: z.string().min(1, 'الوصف مطلوب للسطر'),
      quantity: z.number().positive('الكمية يجب أن تكون أكبر من الصفر'),
      unitPrice: z.number().nonnegative('سعر الوحدة لا يمكن أن يكون سالباً')
    })).min(1, 'يجب إدراج بند مالي واحد على الأقل في الفاتورة'),
    notes: z.string().optional(),
    status: z.enum(['draft', 'unpaid', 'paid', 'overdue']).optional()
  })
});

export const updateInvoiceSchema = z.object({
  body: z.object({
    contactId: z.string().min(1, 'معرف جهة الاتصال مطلوب').optional(),
    invoiceNumber: z.string().min(1, 'رقم الفاتورة مطلوب').optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ الفاتورة غير صالح، الصيغة المتوقعة YYYY-MM-DD').optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ الاستحقاق غير صالح، الصيغة المتوقعة YYYY-MM-DD').optional(),
    lines: z.array(z.object({
      description: z.string().min(1, 'الوصف مطلوب للسطر'),
      quantity: z.number().positive('الكمية يجب أن تكون أكبر من الصفر'),
      unitPrice: z.number().nonnegative('سعر الوحدة لا يمكن أن يكون سالباً')
    })).min(1, 'يجب إدراج بند مالي واحد على الأقل في الفاتورة').optional(),
    notes: z.string().optional(),
    status: z.enum(['draft', 'unpaid', 'paid', 'overdue']).optional()
  })
});
