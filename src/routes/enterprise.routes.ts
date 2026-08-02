import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../swagger.config';
import { authenticate } from '../middleware/auth.middleware';
import { SecurityService } from '../services/security.service';
import { WorkflowEngineService, WorkflowRule } from '../services/workflow-engine.service';
import { microservicesBroker } from '../services/microservices.service';
import { cacheService } from '../services/cache.service';
import { GoogleGenAI, Type } from '@google/genai';
import { logger } from '../config/logger';
import { jsonDB } from '../data/jsonDatabase';

const router = Router();

// ============================================================
// 1. API Strategy (Proposal 5): Expose Swagger Docs
// ============================================================
// Raw Swagger Spec JSON
router.get('/docs/json', (req: Request, res: Response) => {
  res.json(swaggerSpec);
});

// Mounted Swagger UI
router.use('/docs/ui', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ============================================================
// 2. Security & Compliance (Proposal 3): Audit Logs
// ============================================================
router.get('/security/audit-logs', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || 'tenant-promet-sa';
    
    // Check ABAC for sensitive log access (Only Admin/Manager)
    const userRole = req.user?.role;
    if (userRole !== 'admin' && userRole !== 'manager') {
      return res.status(403).json({ error: 'صلاحية غير كافية للاطلاع على سجلات الامتثال الموحدة (ISO 27001)' });
    }

    const logs = await SecurityService.getAuditLogs(tenantId);
    return res.json({ success: true, count: logs.length, logs });
  } catch (err: any) {
    logger.error('Failed to retrieve audit logs:', err);
    return res.status(500).json({ error: 'فشل استرجاع سجلات الرقابة الأمنية.' });
  }
});

// Test/Verify secure decryption endpoint (Demonstrating ABAC check & E2E rest-at encryption)
router.post('/security/decrypt-test', authenticate, (req: Request, res: Response) => {
  const { encryptedText } = req.body;
  if (!encryptedText) {
    return res.status(400).json({ error: 'يرجى تقديم النص المشفر' });
  }
  
  // ABAC permission check
  const abacCheck = SecurityService.checkABAC(req.user, 'read', 'salary', { tenantId: req.tenantId });
  if (!abacCheck.allowed) {
    return res.status(403).json({ error: `حظر أمني تلقائي (ABAC): ${abacCheck.reason}` });
  }

  const decrypted = SecurityService.decrypt(encryptedText);
  return res.json({ decrypted });
});

// ============================================================
// 3. Workflow Engine (Proposal 2): Rule Automation API
// ============================================================
router.get('/workflows/rules', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || 'tenant-promet-sa';
    const rules = await WorkflowEngineService.getRules(tenantId);
    return res.json(rules);
  } catch (err: any) {
    return res.status(500).json({ error: 'فشل تحميل قواعد الأتمتة' });
  }
});

router.post('/workflows/rules', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || 'tenant-promet-sa';
    const { name, triggerEvent, actionType, actionConfig, isActive } = req.body;

    if (!name || !triggerEvent || !actionType) {
      return res.status(400).json({ error: 'الحقول الأساسية للاسم والمشغل والإجراء مطلوبة' });
    }

    const rule: WorkflowRule = {
      id: req.body.id || `rule-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenantId,
      name,
      triggerEvent,
      actionType,
      actionConfig: actionConfig || {},
      isActive: isActive !== false,
      createdAt: new Date().toISOString()
    };

    await WorkflowEngineService.saveRule(rule);
    
    // Log audit log for new rule creation
    await SecurityService.logAction({
      userId: req.user?.id || 'u-unknown',
      userName: req.user?.name || 'مستخدم غير معروف',
      tenantId,
      action: 'WORKFLOW_RULE_CREATE',
      resourceId: rule.id,
      details: `تم إنشاء/تعديل قاعدة أتمتة الأعمال الذكية باسم: ${name}`
    });

    return res.status(201).json({ success: true, rule });
  } catch (err: any) {
    return res.status(500).json({ error: 'فشل حفظ قاعدة أتمتة الأعمال' });
  }
});

router.delete('/workflows/rules/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || 'tenant-promet-sa';
    const { id } = req.params;

    await WorkflowEngineService.deleteRule(id, tenantId);

    await SecurityService.logAction({
      userId: req.user?.id || 'u-unknown',
      userName: req.user?.name || 'مستخدم غير معروف',
      tenantId,
      action: 'WORKFLOW_RULE_DELETE',
      resourceId: id,
      details: `تم إزالة قاعدة أتمتة الأعمال المعرفة بالمعرف: ${id}`
    });

    return res.json({ success: true, message: 'تم إزالة قاعدة أتمتة الأعمال بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ error: 'فشل إزالة القاعدة' });
  }
});

// ============================================================
// 4. Microservices Status (Proposal 1): Broker Telemetry
// ============================================================
router.get('/microservices/status', authenticate, (req: Request, res: Response) => {
  const brokerStats = microservicesBroker.getBrokerStats();
  const cacheStats = cacheService.getStats();

  const mockMicroservicesHealth = {
    authService: { status: 'healthy', latency: '12ms', ip: '10.124.0.5' },
    billingService: { status: 'healthy', latency: '24ms', ip: '10.124.1.8' },
    payrollService: { status: 'healthy', latency: '18ms', ip: '10.124.2.14' },
    inventoryService: { status: 'healthy', latency: '15ms', ip: '10.124.3.22' }
  };

  // Resolve target DB sharding configuration
  const tenantId = (req as any).tenantId || 'tenant-promet-sa';
  const shardNode = microservicesBroker.getShardNode(tenantId);

  return res.json({
    broker: brokerStats,
    cache: cacheStats,
    services: mockMicroservicesHealth,
    sharding: {
      activeTenantId: tenantId,
      resolvedNode: shardNode
    }
  });
});

// ============================================================
// 5. AI Predictive Core (Proposal 2): Gemini Dashboard Core
// ============================================================
router.get('/ai/predictions', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || 'tenant-promet-sa';
    
    // Check memory cache first to protect API quotas and accelerate performance
    const cacheKey = `ai-predictions-${tenantId}`;
    const cachedData = await cacheService.get<any>(cacheKey);
    if (cachedData) {
      return res.json({ source: 'cache', data: cachedData });
    }

    // Load actual live sharded database records for the current tenant
    const db = jsonDB.load();
    const invoices = (db.invoices || []).filter((i: any) => i.tenantId === tenantId);
    const payroll = (db.payroll || []).filter((p: any) => p.tenantId === tenantId);
    const products = (db.products || []).filter((p: any) => p.tenantId === tenantId);
    const scrap = (db.scrap || []).filter((s: any) => s.tenantId === tenantId);
    const employees = (db.employees || []).filter((e: any) => e.tenantId === tenantId);

    // Calculate real live enterprise metrics
    const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + Number(inv.totalAmount || inv.amount || 0), 0);
    const paidRevenue = invoices.filter((inv: any) => inv.status === 'paid' || inv.status === 'Paid').reduce((sum: number, inv: any) => sum + Number(inv.totalAmount || inv.amount || 0), 0);
    const totalExpenses = payroll.reduce((sum: number, pay: any) => sum + Number(pay.netSalary || pay.net_salary || 0), 0);
    const unpaidInvoicesCount = invoices.filter((inv: any) => inv.status !== 'paid' && inv.status !== 'Paid').length;
    const lowStockCount = products.filter((p: any) => Number(p.stockQuantity) <= Number(p.minStock || 5)).length;
    const activeEmployeesCount = employees.filter((e: any) => e.status === 'active' || e.status === 'Active').length;
    const totalScrapWeight = scrap.reduce((sum: number, s: any) => sum + Number(s.weight || 0), 0);

    // Construct highly context-aware prompt using real live data
    const promptContext = `
      نحن نعد تقرير الذكاء الاصطناعي للتنبؤ المالي للمؤسسة بناءً على البيانات الحية الفعلية المستخرجة من قاعدة البيانات المشتركة:
      - إجمالي قيمة الفواتير المصدرة (إيرادات مخططة): ${totalRevenue} ريال سعودي.
      - إجمالي الإيرادات المحصلة فعلياً: ${paidRevenue} ريال سعودي.
      - إجمالي الرواتب والمصروفات المسجلة: ${totalExpenses} ريال سعودي.
      - عدد الموظفين النشطين في المؤسسة: ${activeEmployeesCount} موظفاً.
      - الفواتير معلقة التحصيل وغير المسددة: ${unpaidInvoicesCount} فواتير.
      - عدد المنتجات التي قاربت على نفاد المخزون (تحت حد الأمان): ${lowStockCount} منتجاً.
      - إجمالي وزن الخردة والمخلفات الصناعية المعاد تدويرها: ${totalScrapWeight} كجم.
      
      المطلوب: توليد ملف JSON يتضمن ثلاثة أقسام للتنبؤ المالي الدقيق والواقعي للمؤسسة للثلاثة أشهر القادمة باللغة العربية بناءً على المؤشرات الفعلية السابقة:
      1. predictiveCashflow: مصفوفة من ثلاثة عناصر تمثل (أغسطس، سبتمبر، أكتوبر) وكل عنصر به (month, revenue, expenses) وتكون متناسبة مع الأرقام الحقيقية المذكورة أعلاه.
      2. anomalyDetection: مصفوفة من العناصر Flagged anomalies بها (title, description, severity, status). إذا كان هناك نقص مخزون أو فواتير غير مسددة، يجب تضمينها كشذوذ حقيقي مبرهن برمجياً.
      3. growthOpportunities: مصفوفة من ثلاث توصيات ذكية لنمو المؤسسة وترشيد المصاريف بها (opportunity, estimatedSavings, impactLevel).
    `;

    let finalResponse: any = null;

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: promptContext,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                predictiveCashflow: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      month: { type: Type.STRING },
                      revenue: { type: Type.NUMBER },
                      expenses: { type: Type.NUMBER }
                    }
                  }
                },
                anomalyDetection: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      severity: { type: Type.STRING },
                      status: { type: Type.STRING }
                    }
                  }
                },
                growthOpportunities: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      opportunity: { type: Type.STRING },
                      estimatedSavings: { type: Type.STRING },
                      impactLevel: { type: Type.STRING }
                    }
                  }
                }
              },
              required: ['predictiveCashflow', 'anomalyDetection', 'growthOpportunities']
            }
          }
        });

        if (response.text) {
          finalResponse = JSON.parse(response.text.trim());
        }
      } catch (geminiErr: any) {
        logger.error('Gemini prediction failed, falling back to local model logic:', geminiErr);
      }
    }

    // Robust rule-based fallback if Gemini fails or Key is not provided
    if (!finalResponse) {
      const monthlyRevenueAvg = paidRevenue > 0 ? Math.round(paidRevenue / 1) : 120000;
      const monthlyExpenseAvg = totalExpenses > 0 ? totalExpenses : 45000;

      const anomalies = [];
      if (lowStockCount > 0) {
        anomalies.push({
          title: 'خطر نفاد المخزون ببعض السلع',
          description: `هناك ${lowStockCount} منتجاً مسجلاً في النظام تجاوزت حد الأمان الأدنى للمخزون مما يهدد استمرارية التوريد.`,
          severity: 'high',
          status: 'flagged'
        });
      }
      if (unpaidInvoicesCount > 0) {
        anomalies.push({
          title: 'تأخر تحصيل فواتير العملاء',
          description: `يوجد في النظام ${unpaidInvoicesCount} فواتير معلقة وغير مسددة، مما يؤدي إلى ضغوط على التدفق النقدي المتاح.`,
          severity: 'medium',
          status: 'under_review'
        });
      }
      if (totalScrapWeight > 1000) {
        anomalies.push({
          title: 'ارتفاع حجم الفاقد الصناعي (الخردة)',
          description: `تم تسجيل كمية كبيرة من الخردة والمخلفات بوزن إجمالي ${totalScrapWeight} كجم، مما يستدعي إعادة معايرة خط الإنتاج.`,
          severity: 'low',
          status: 'flagged'
        });
      }

      if (anomalies.length === 0) {
        anomalies.push({
          title: 'توازن عام في التدفقات النقدية',
          description: 'لم يتم رصد أي أنشطة شاذة أو تباينات ملحوظة في القيود والمستندات الحالية للمؤسسة.',
          severity: 'low',
          status: 'resolved'
        });
      }

      finalResponse = {
        predictiveCashflow: [
          { month: 'أغسطس 2026', revenue: Math.round(monthlyRevenueAvg * 1.05), expenses: Math.round(monthlyExpenseAvg * 0.98) },
          { month: 'سبتمبر 2026', revenue: Math.round(monthlyRevenueAvg * 1.12), expenses: Math.round(monthlyExpenseAvg * 1.01) },
          { month: 'أكتوبر 2026', revenue: Math.round(monthlyRevenueAvg * 1.20), expenses: Math.round(monthlyExpenseAvg * 0.99) }
        ],
        anomalyDetection: anomalies,
        growthOpportunities: [
          {
            opportunity: `أتمتة شراء المنتجات منخفضة المخزون (${lowStockCount} منتجات)`,
            estimatedSavings: 'حوالي 15,000 ريال سعودي سنوياً من تحسين سلاسل الإمداد وتقليص التخزين العشوائي.',
            impactLevel: 'high'
          },
          {
            opportunity: `تحسين نظام تحصيل الفواتير المعلقة (${unpaidInvoicesCount} فواتير معلقة)`,
            estimatedSavings: 'استرداد سريع للتدفق النقدي بقيمة قد تصل إلى ' + Math.round(totalRevenue - paidRevenue) + ' ريال سعودي مع تقليص الديون المعدومة.',
            impactLevel: 'high'
          },
          {
            opportunity: `إعادة تدوير الخردة الحالية لخط الإنتاج (${totalScrapWeight} كجم)`,
            estimatedSavings: 'حوالي 7,500 ريال سعودي من خفض تكاليف المواد الخام والحد من الهدر.',
            impactLevel: 'medium'
          }
        ]
      };
    }

    // Cache the predictions for 5 minutes (300 seconds)
    await cacheService.set(cacheKey, finalResponse, 300);

    return res.json({ source: 'engine', data: finalResponse });
  } catch (err: any) {
    logger.error('Error generating AI predictions:', err);
    return res.status(500).json({ error: 'فشل معالجة التوقعات الذكية للذكاء الاصطناعي: ' + err.message });
  }
});

export default router;
