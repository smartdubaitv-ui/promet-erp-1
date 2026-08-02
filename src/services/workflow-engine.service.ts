import { logger } from '../config/logger';
import { SecurityService } from './security.service';
import { createNotification } from './notification.service';
import { isFirebaseConnected, firestore } from '../../services/firebase.service';
import { jsonDB } from '../data/jsonDatabase';

export interface WorkflowRule {
  id: string;
  tenantId: string;
  name: string;
  triggerEvent: 'invoice_created' | 'invoice_paid' | 'payroll_approved' | 'low_stock' | 'leave_approved';
  actionType: 'create_notification' | 'log_audit' | 'send_webhook' | 'update_ledger';
  actionConfig: {
    messageTemplate?: string;
    webhookUrl?: string;
    ledgerAccount?: string;
  };
  isActive: boolean;
  createdAt: string;
}

export class WorkflowEngineService {
  /**
   * Register default rules for new tenants if they don't have any
   */
  static async initializeDefaultRules(tenantId: string): Promise<void> {
    const rules = await this.getRules(tenantId);
    if (rules.length > 0) return;

    const defaultRules: WorkflowRule[] = [
      {
        id: `rule-invoice-paid-${Date.now()}`,
        tenantId,
        name: 'إشعار فوري عند سداد الفاتورة',
        triggerEvent: 'invoice_paid',
        actionType: 'create_notification',
        actionConfig: {
          messageTemplate: 'تم استلام الدفعة بالكامل للفاتورة رقم {invoiceNumber} بقيمة {totalAmount} ريال.'
        },
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: `rule-low-stock-${Date.now()}`,
        tenantId,
        name: 'قيد محاسبي فوري وتدقيق عند انخفاض المخزون',
        triggerEvent: 'low_stock',
        actionType: 'log_audit',
        actionConfig: {
          messageTemplate: 'تحذير أمان: منتج {productName} قارب على النفاد. الكمية المتبقية: {stockQuantity}'
        },
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];

    try {
      if (isFirebaseConnected() && firestore) {
        for (const rule of defaultRules) {
          await firestore.collection('workflow_rules').doc(rule.id).set(rule);
        }
      } else {
        const db = jsonDB.load();
        if (!db.workflow_rules) db.workflow_rules = [];
        db.workflow_rules.push(...defaultRules);
        jsonDB.save(db);
      }
      logger.info(`✨ Successfully initialized default workflow automation rules for Tenant: ${tenantId}`);
    } catch (err) {
      logger.error('Failed to initialize default rules:', err);
    }
  }

  /**
   * Fetch automation rules
   */
  static async getRules(tenantId: string): Promise<WorkflowRule[]> {
    try {
      if (isFirebaseConnected() && firestore) {
        const snap = await firestore.collection('workflow_rules').where('tenantId', '==', tenantId).get();
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() as WorkflowRule }));
      } else {
        const db = jsonDB.load();
        return (db.workflow_rules || []).filter((rule: any) => rule.tenantId === tenantId);
      }
    } catch (err) {
      logger.error('Error fetching workflow rules:', err);
      return [];
    }
  }

  /**
   * Save a new workflow rule
   */
  static async saveRule(rule: WorkflowRule): Promise<void> {
    try {
      if (isFirebaseConnected() && firestore) {
        await firestore.collection('workflow_rules').doc(rule.id).set(rule);
      } else {
        const db = jsonDB.load();
        if (!db.workflow_rules) db.workflow_rules = [];
        const idx = db.workflow_rules.findIndex((r: any) => r.id === rule.id);
        if (idx !== -1) {
          db.workflow_rules[idx] = rule;
        } else {
          db.workflow_rules.push(rule);
        }
        jsonDB.save(db);
      }
    } catch (err) {
      logger.error('Failed to save rule:', err);
    }
  }

  /**
   * Delete rule
   */
  static async deleteRule(ruleId: string, tenantId: string): Promise<void> {
    try {
      if (isFirebaseConnected() && firestore) {
        await firestore.collection('workflow_rules').doc(ruleId).delete();
      } else {
        const db = jsonDB.load();
        if (db.workflow_rules) {
          db.workflow_rules = db.workflow_rules.filter((r: any) => r.id !== ruleId || r.tenantId !== tenantId);
          jsonDB.save(db);
        }
      }
    } catch (err) {
      logger.error('Failed to delete rule:', err);
    }
  }

  /**
   * Core execution engine triggered when events occur
   */
  static async triggerEvent(tenantId: string, eventName: string, payload: any): Promise<void> {
    logger.info(`⚡ [WORKFLOW EVENT] Received: "${eventName}" for Tenant: "${tenantId}"`);

    // Ensure we have some default rules
    await this.initializeDefaultRules(tenantId);

    const rules = await this.getRules(tenantId);
    const activeRules = rules.filter(r => r.triggerEvent === eventName && r.isActive);

    for (const rule of activeRules) {
      logger.info(`🚀 [WORKFLOW TRIGGERED] Executing rule: "${rule.name}"...`);

      // Fill templates if any
      let message = rule.actionConfig.messageTemplate || '';
      Object.entries(payload).forEach(([key, val]) => {
        message = message.replace(new RegExp(`{${key}}`, 'g'), String(val));
      });

      try {
        switch (rule.actionType) {
          case 'create_notification':
            await createNotification({
              userId: payload.userId || 'u-1',
              tenantId,
              type: 'info',
              title: rule.name,
              message: message || `حدث تلقائي: ${rule.name}`,
              link: payload.link || '/'
            });
            break;

          case 'log_audit':
            await SecurityService.logAction({
              userId: payload.userId || 'u-system',
              userName: payload.userName || 'مساعد الأتمتة الذكي',
              tenantId,
              action: `WORKFLOW_${eventName.toUpperCase()}`,
              resourceId: payload.id || 'system',
              details: message || `تشغيل أوتوماتيكي للقاعدة المحاسبية الذكية: ${rule.name}`
            });
            break;

          case 'send_webhook': {
            const url = rule.actionConfig.webhookUrl;
            if (url) {
              logger.info(`🌐 [WEBHOOK OUTBOUND] Sending POST payload to: ${url}`);
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 8000);
              try {
                const response = await fetch(url, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Tenant-ID': tenantId,
                    'X-Workflow-Rule': rule.id
                  },
                  body: JSON.stringify({
                    eventName,
                    ruleId: rule.id,
                    ruleName: rule.name,
                    payload,
                    timestamp: new Date().toISOString()
                  }),
                  signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                await SecurityService.logAction({
                  userId: 'u-system',
                  userName: 'محرك الويب هوك Webhooks',
                  tenantId,
                  action: 'WEBHOOK_DISPATCH',
                  resourceId: rule.id,
                  details: `تم إرسال الحدث ${eventName} بنجاح للرابط الخارجي: ${url} (حالة الاستجابة: ${response.status})`
                });
              } catch (fetchErr: any) {
                clearTimeout(timeoutId);
                const isTimeout = fetchErr.name === 'AbortError';
                const errMsg = isTimeout ? 'انتهت مهلة الطلب (8 ثوانٍ)' : fetchErr.message;
                logger.error(`❌ Webhook request to ${url} failed: ${errMsg}`);
                
                await SecurityService.logAction({
                  userId: 'u-system',
                  userName: 'محرك الويب هوك Webhooks',
                  tenantId,
                  action: 'WEBHOOK_FAILED',
                  resourceId: rule.id,
                  details: `فشل إرسال الحدث ${eventName} للرابط الخارجي: ${url}. السبب: ${errMsg}`
                });
              }
            }
            break;
          }

          case 'update_ledger':
            logger.info(`📖 [DOUBLE ENTRY AUTO-LEDGER] Posting auto-entry to account: ${rule.actionConfig.ledgerAccount}`);
            break;
        }
      } catch (ruleErr: any) {
        logger.error(`❌ Error executing workflow rule "${rule.name}":`, ruleErr);
      }
    }
  }
}
