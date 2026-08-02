import { Request, Response } from 'express';
import { RecurringInvoicesService } from '../services/recurring-invoices.service';
import { logger } from '../config/logger';

/**
 * جلب جميع قوالب الفواتير الدورية
 * GET /api/recurring-invoices
 */
export async function getRecurringInvoices(req: Request, res: Response) {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  try {
    const templates = await RecurringInvoicesService.getTemplates(tenantId);
    return res.status(200).json(templates);
  } catch (error) {
    logger.error('❌ Failed to fetch recurring invoice templates:', error);
    return res.status(500).json({ error: 'فشل في تحميل قوالب الفواتير الدورية' });
  }
}

/**
 * إنشاء قالب فاتورة دورية جديد
 * POST /api/recurring-invoices
 */
export async function createRecurringInvoiceTemplate(req: Request, res: Response) {
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const { contactId, contactName, frequency, nextExecutionDate, isActive, notes, lines } = req.body;

  try {
    // تجهيز بنود الفاتورة وحساب إجمالياتها بشكل آمن لمنع التلاعب بالأسعار
    const preparedLines = lines.map((l: any) => {
      const quantity = Number(l.quantity) || 1;
      const unitPrice = Number(l.unitPrice) || 0;
      return {
        productId: l.productId || null,
        description: l.description,
        quantity,
        unitPrice,
        amount: Number((quantity * unitPrice).toFixed(2))
      };
    });

    const totalAmount = preparedLines.reduce((sum: number, line: any) => sum + line.amount, 0);

    const id = `rec-tmpl-${Date.now()}`;
    const newTemplate = await RecurringInvoicesService.createTemplate({
      id,
      tenantId,
      contactId,
      contactName,
      frequency,
      nextExecutionDate,
      isActive: isActive !== false,
      notes,
      lines: preparedLines,
      totalAmount
    });

    return res.status(201).json(newTemplate);
  } catch (error) {
    logger.error('❌ Failed to create recurring invoice template:', error);
    return res.status(500).json({ error: 'فشل في إنشاء قالب الفاتورة الدورية' });
  }
}

/**
 * تحديث قالب فاتورة دورية قائم
 * PUT /api/recurring-invoices/:id
 */
export async function updateRecurringInvoice(req: Request, res: Response) {
  const { id } = req.params;
  const updates = req.body;

  try {
    if (updates.lines) {
      updates.lines = updates.lines.map((l: any) => {
        const quantity = Number(l.quantity) || 1;
        const unitPrice = Number(l.unitPrice) || 0;
        return {
          productId: l.productId || null,
          description: l.description,
          quantity,
          unitPrice,
          amount: Number((quantity * unitPrice).toFixed(2))
        };
      });
      updates.totalAmount = updates.lines.reduce((sum: number, line: any) => sum + line.amount, 0);
    }

    const updated = await RecurringInvoicesService.updateTemplate(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'قالب الفاتورة الدورية غير موجود' });
    }
    return res.status(200).json(updated);
  } catch (error) {
    logger.error('❌ Failed to update recurring invoice template:', error);
    return res.status(500).json({ error: 'فشل في تحديث قالب الفاتورة الدورية' });
  }
}

/**
 * حذف قالب فاتورة دورية
 * DELETE /api/recurring-invoices/:id
 */
export async function deleteRecurringInvoice(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const success = await RecurringInvoicesService.deleteTemplate(id);
    if (!success) {
      return res.status(404).json({ error: 'قالب الفاتورة الدورية غير موجود' });
    }
    return res.status(200).json({ message: 'تم حذف قالب الفاتورة الدورية بنجاح' });
  } catch (error) {
    logger.error('❌ Failed to delete recurring invoice template:', error);
    return res.status(500).json({ error: 'فشل في حذف قالب الفاتورة الدورية' });
  }
}
