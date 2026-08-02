import Big from 'big.js';
import { firestore, isFirebaseConnected } from '../../services/firebase.service';
import { jsonDB } from '../data/jsonDatabase';
import { createNotification } from './notification.service';
import { RecurringInvoiceTemplate, Invoice } from '../types';
import { logger } from '../config/logger';
import { ApprovalService } from './approval.service';

export class RecurringInvoicesService {
  /**
   * إنشاء قالب فاتورة دورية جديدة
   */
  static async createTemplate(template: Omit<RecurringInvoiceTemplate, 'createdAt'>): Promise<RecurringInvoiceTemplate> {
    const newTemplate: RecurringInvoiceTemplate = {
      ...template,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConnected() && firestore) {
      await firestore.collection('recurring_invoice_templates').doc(newTemplate.id).set(newTemplate);
    } else {
      const db = jsonDB.load();
      if (!db.recurring_invoice_templates) db.recurring_invoice_templates = [];
      db.recurring_invoice_templates.push(newTemplate);
      jsonDB.save(db);
    }

    logger.info(`🔄 Recurring invoice template created for contact ID: ${template.contactId} with frequency ${template.frequency}`);
    return newTemplate;
  }

  /**
   * جلب جميع قوالب الفواتير الدورية
   */
  static async getTemplates(tenantId: string): Promise<RecurringInvoiceTemplate[]> {
    if (isFirebaseConnected() && firestore) {
      const snap = await firestore.collection('recurring_invoice_templates').where('tenantId', '==', tenantId).get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecurringInvoiceTemplate));
    } else {
      const db = jsonDB.load();
      return (db.recurring_invoice_templates || []).filter((t: any) => t.tenantId === tenantId);
    }
  }

  /**
   * جلب قالب محدد بالمعرف
   */
  static async getTemplateById(id: string): Promise<RecurringInvoiceTemplate | null> {
    if (isFirebaseConnected() && firestore) {
      const doc = await firestore.collection('recurring_invoice_templates').doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() } as RecurringInvoiceTemplate;
    } else {
      const db = jsonDB.load();
      const t = (db.recurring_invoice_templates || []).find((x: any) => x.id === id);
      return t || null;
    }
  }

  /**
   * تحديث قالب فاتورة دورية
   */
  static async updateTemplate(id: string, updates: Partial<RecurringInvoiceTemplate>): Promise<RecurringInvoiceTemplate | null> {
    const template = await this.getTemplateById(id);
    if (!template) return null;

    const updatedTemplate = { ...template, ...updates };

    if (isFirebaseConnected() && firestore) {
      await firestore.collection('recurring_invoice_templates').doc(id).set(updatedTemplate);
    } else {
      const db = jsonDB.load();
      const index = (db.recurring_invoice_templates || []).findIndex((t: any) => t.id === id);
      if (index !== -1) {
        db.recurring_invoice_templates[index] = updatedTemplate;
        jsonDB.save(db);
      }
    }

    logger.info(`⚙️ Recurring invoice template updated ID: ${id}`);
    return updatedTemplate;
  }

  /**
   * حذف قالب فاتورة دورية
   */
  static async deleteTemplate(id: string): Promise<boolean> {
    if (isFirebaseConnected() && firestore) {
      await firestore.collection('recurring_invoice_templates').doc(id).delete();
      return true;
    } else {
      const db = jsonDB.load();
      const index = (db.recurring_invoice_templates || []).findIndex((t: any) => t.id === id);
      if (index === -1) return false;
      db.recurring_invoice_templates.splice(index, 1);
      jsonDB.save(db);
      return true;
    }
  }

  /**
   * تشغيل فحص الفواتير الدورية وتوليد الفواتير المستحقة تلقائياً
   */
  static async processRecurringInvoices(tenantId: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const templates = await this.getTemplates(tenantId);
      const activeTemplates = templates.filter(t => t.isActive && t.nextExecutionDate <= today);

      if (activeTemplates.length === 0) return;

      logger.info(`⏳ Found ${activeTemplates.length} active recurring invoice templates to process...`);

      for (const temp of activeTemplates) {
        const invoiceId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const invoiceNumber = `INV-REC-${Math.floor(10000 + Math.random() * 90000)}`;
        const date = temp.nextExecutionDate;

        // حساب تاريخ الاستحقاق (افتراضياً بعد 30 يوماً)
        const dueDateObj = new Date(date);
        dueDateObj.setDate(dueDateObj.getDate() + 30);
        const dueDate = dueDateObj.toISOString().split('T')[0];

        // سطر مبيعات الفاتورة مع توليد معرّفات فريدة لكل سطر وحساب دقيق باستخدام big.js
        const preparedLines = temp.lines.map((l, idx) => {
          const uPriceBig = new Big(l.unitPrice || 0).round(2);
          const qtyBig = new Big(l.quantity || 0);
          const amtBig = qtyBig.times(uPriceBig).round(2);

          return {
            id: `line-${invoiceId}-${idx}-${Date.now()}`,
            invoiceId,
            productId: l.productId || null,
            description: l.description,
            quantity: l.quantity,
            unitPrice: Number(uPriceBig.toFixed(2)),
            amount: Number(amtBig.toFixed(2))
          };
        });

        const calculatedTotalBig = preparedLines.reduce((sum, line) => sum.plus(new Big(line.amount)), new Big(0));
        const totalAmount = Number(calculatedTotalBig.toFixed(2));

        const threshold = await ApprovalService.getInvoiceApprovalThreshold(temp.tenantId);
        const isPendingApproval = totalAmount > threshold;
        const finalStatus = isPendingApproval ? 'Pending Approval' : 'unpaid';

        const newInvoice: Invoice = {
          id: invoiceId,
          tenantId: temp.tenantId,
          contactId: temp.contactId,
          invoiceNumber,
          date,
          dueDate,
          totalAmount,
          paidAmount: 0,
          status: finalStatus,
          notes: temp.notes || 'فاتورة دورية تم إنشاؤها تلقائياً بواسطة نظام الأتمتة.',
          createdAt: new Date().toISOString(),
          lines: preparedLines
        };

        // If pending approval, automatically create an approval request
        if (isPendingApproval) {
          await ApprovalService.createApproval({
            id: `appr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            tenantId: temp.tenantId,
            recordType: 'invoice',
            recordId: invoiceId,
            recordIdentifier: invoiceNumber,
            requesterId: 'system',
            requesterName: 'نظام الفواتير الدورية (تلقائي)'
          });
        }

        // 1. حفظ الفاتورة الجديدة
        if (isFirebaseConnected() && firestore) {
          await firestore.collection('invoices').doc(invoiceId).set(newInvoice);
        } else {
          const db = jsonDB.load();
          if (!db.invoices) db.invoices = [];
          db.invoices.push(newInvoice);
          jsonDB.save(db);
        }

        // 2. تحديث القالب بالتاريخ القادم
        const nextExecutionDate = this.calculateNextDate(date, temp.frequency);
        await this.updateTemplate(temp.id, {
          lastExecutionDate: date,
          nextExecutionDate
        });

        // 3. إرسال إشعار للنظام
        const notificationTitle = isPendingApproval 
          ? `فاتورة دورية معلقة بانتظار الموافقة: ${invoiceNumber} 🔄`
          : `توليد فاتورة دورية تلقائياً: ${invoiceNumber} 🔄`;
        const notificationMessage = isPendingApproval
          ? `قام النظام تلقائياً بتوليد فاتورة دورية بقيمة ${temp.totalAmount} ر.س. وبسبب تجاوزها حد الموافقة تم إحالتها للاعتماد بنجاح.`
          : `قام النظام تلقائياً بتوليد فاتورة دورية مستحقة للعميل بقيمة ${temp.totalAmount} ر.س. تاريخ التنفيذ القادم هو ${nextExecutionDate}.`;

        await createNotification({
          userId: 'u-1',
          tenantId: temp.tenantId,
          type: isPendingApproval ? 'warning' : 'success',
          title: notificationTitle,
          message: notificationMessage,
          link: isPendingApproval ? '/approvals' : '/invoices'
        });

        logger.info(`✅ Successfully generated invoice ${invoiceNumber} from recurring template ${temp.id} (Status: ${finalStatus})`);
      }
    } catch (error) {
      logger.error('❌ Failed to process recurring invoices:', error);
    }
  }

  /**
   * حساب التاريخ القادم بناءً على الدورية
   */
  private static calculateNextDate(currentDateStr: string, frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
    const date = new Date(currentDateStr);
    if (frequency === 'daily') {
      date.setDate(date.getDate() + 1);
    } else if (frequency === 'weekly') {
      date.setDate(date.getDate() + 7);
    } else if (frequency === 'monthly') {
      date.setMonth(date.getMonth() + 1);
    } else if (frequency === 'yearly') {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date.toISOString().split('T')[0];
  }
}
