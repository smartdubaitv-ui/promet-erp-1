import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const DB_FILE = path.join(process.cwd(), 'database.json');

function getLocalDatabase(): any {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading local database in audit router:', e);
  }
  return {};
}

function saveLocalDatabase(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing local database in audit router:', e);
  }
}

// Ensure audit collections exist
function ensureAuditCollections(db: any) {
  if (!db.audit_logs) {
    db.audit_logs = [
      { id: 1, action_type: 'INSERT', table_name: 'invoices', record_id: 101, user_id: 'u-1', user_name: 'مدير النظام', description: 'إصدار فاتورة مبيعات جديدة رقم INV-2026-001', ip_address: '127.0.0.1', status: 'success', created_at: new Date(Date.now() - 3600000).toISOString() },
      { id: 2, action_type: 'UPDATE', table_name: 'employees', record_id: 12, user_id: 'u-2', user_name: 'المحاسب الرئيسي', description: 'تعديل أساسي في راتب الموظف رقم 12', ip_address: '192.168.1.15', status: 'success', created_at: new Date(Date.now() - 7200000).toISOString() }
    ];
  }
  if (!db.audit_sensitive) {
    db.audit_sensitive = [
      { id: 1, entity_type: 'payroll', entity_id: 5, field_name: 'basic_salary', old_value: '8000', new_value: '9500', changed_by: 'أحمد المحاسب', status: 'pending', created_at: new Date().toISOString() }
    ];
  }
  if (!db.closing_periods) {
    db.closing_periods = [
      { id: 1, period_type: 'monthly', period_date: '2026-06-30', status: 'open', initiated_by: 'مدير النظام', notes: 'إغلاق شهر يونيو 2026', created_at: new Date().toISOString() }
    ];
  }
  if (!db.closing_tasks) {
    db.closing_tasks = [
      { id: 1, period_id: 1, title: 'مطابقة أرصدة البنوك والخزينة', status: 'completed', assigned_to: 'أمين الخزينة' },
      { id: 2, period_id: 1, title: 'احتساب وتسجيل إهلاك الأصول الثابتة', status: 'pending', assigned_to: 'المحاسب المالي' },
      { id: 3, period_id: 1, title: 'مراجعة قيود التسوية والرواتب', status: 'pending', assigned_to: 'المراجع الداخلي' }
    ];
  }
  if (!db.closing_adjustments) {
    db.closing_adjustments = [
      { id: 1, period_id: 1, account_name: 'مصاريف إهلاك الأصول', debit: 4500, credit: 0, status: 'suggested', description: 'قيد إهلاك أصول شهر يونيو' }
    ];
  }
}

// 1. GET /api/audit/statistics
router.get('/statistics', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  ensureAuditCollections(db);
  saveLocalDatabase(db);

  const logs = db.audit_logs || [];
  const sensitive = db.audit_sensitive || [];

  const byActionMap: Record<string, number> = {};
  logs.forEach((l: any) => {
    const act = l.action_type || 'UNKNOWN';
    byActionMap[act] = (byActionMap[act] || 0) + 1;
  });

  const by_action = Object.entries(byActionMap).map(([action_type, count]) => ({ action_type, count }));
  const pending_sensitive = sensitive.filter((s: any) => s.status === 'pending').length;

  res.json({
    total_actions: logs.length,
    by_action,
    by_user: [],
    pending_sensitive
  });
});

// 2. GET /api/audit/sensitive
router.get('/sensitive', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  ensureAuditCollections(db);
  saveLocalDatabase(db);
  res.json(db.audit_sensitive || []);
});

// 3. PUT /api/audit/sensitive/:id
router.put('/sensitive/:id', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  ensureAuditCollections(db);
  const { id } = req.params;
  const { status, approved_by } = req.body;

  const idx = db.audit_sensitive.findIndex((s: any) => String(s.id) === String(id));
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'التغيير الحساس غير موجود' });
  }

  db.audit_sensitive[idx].status = status;
  db.audit_sensitive[idx].approved_by = approved_by || 'Admin';
  db.audit_sensitive[idx].updated_at = new Date().toISOString();
  saveLocalDatabase(db);

  res.json({ success: true, message: 'تم تحديث حالة التغيير الحساس بنجاح' });
});

// 4. GET /api/audit/log
router.get('/log', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  ensureAuditCollections(db);
  saveLocalDatabase(db);

  let logs = db.audit_logs || [];
  const { action_type, status, date_from, date_to, search, limit = '20', offset = '0' } = req.query;

  if (action_type) {
    logs = logs.filter((l: any) => l.action_type === action_type);
  }
  if (status) {
    logs = logs.filter((l: any) => l.status === status);
  }
  if (search) {
    const q = String(search).toLowerCase();
    logs = logs.filter((l: any) => 
      (l.description && l.description.toLowerCase().includes(q)) ||
      (l.user_name && l.user_name.toLowerCase().includes(q)) ||
      (l.table_name && l.table_name.toLowerCase().includes(q))
    );
  }

  logs = [...logs].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = logs.length;
  const lim = parseInt(String(limit), 10) || 20;
  const off = parseInt(String(offset), 10) || 0;
  const paginated = logs.slice(off, off + lim);

  res.json({
    success: true,
    total,
    data: paginated
  });
});

// 5. POST /api/audit/cleanup
router.post('/cleanup', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  ensureAuditCollections(db);
  // Keep last 100 logs
  if (db.audit_logs && db.audit_logs.length > 100) {
    db.audit_logs = db.audit_logs.slice(0, 100);
  }
  saveLocalDatabase(db);
  res.json({ success: true, message: 'تم تصفية وتنظيف سجلات التدقيق القديمة بنجاح حسب سياسة الاحتفاظ.' });
});

// Closing periods endpoints
router.get('/closing/current', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  ensureAuditCollections(db);
  saveLocalDatabase(db);
  const current = db.closing_periods.find((p: any) => p.status === 'open') || db.closing_periods[0] || null;
  res.json(current);
});

router.get('/closing/:id/tasks', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  ensureAuditCollections(db);
  const { id } = req.params;
  const tasks = (db.closing_tasks || []).filter((t: any) => String(t.period_id) === String(id));
  res.json(tasks);
});

router.get('/closing/:id/adjustments', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  ensureAuditCollections(db);
  const { id } = req.params;
  const adjs = (db.closing_adjustments || []).filter((a: any) => String(a.period_id) === String(id));
  res.json(adjs);
});

router.post('/closing/start', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  ensureAuditCollections(db);
  const { period_type, period_date, notes } = req.body;
  
  const newPeriod = {
    id: db.closing_periods.length + 1,
    period_type: period_type || 'monthly',
    period_date: period_date || new Date().toISOString().split('T')[0],
    status: 'open',
    initiated_by: 'مدير النظام',
    notes: notes || '',
    created_at: new Date().toISOString()
  };

  db.closing_periods.push(newPeriod);
  saveLocalDatabase(db);
  res.json({ success: true, message: 'تم فتح دورة إغلاق جديدة بنجاح', period: newPeriod });
});

router.post('/closing/task/:id/execute', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  ensureAuditCollections(db);
  const { id } = req.params;
  const task = (db.closing_tasks || []).find((t: any) => String(t.id) === String(id));
  if (!task) {
    return res.status(404).json({ error: 'المهمة غير موجودة' });
  }
  task.status = 'completed';
  saveLocalDatabase(db);
  res.json({ success: true, message: 'تم تنفيذ وتأكيد المهمة بنجاح' });
});

router.post('/closing/suggest-adjustments', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  ensureAuditCollections(db);
  const { period_id } = req.body;
  const newAdj = {
    id: (db.closing_adjustments || []).length + 1,
    period_id: period_id || 1,
    account_name: 'أرباح وخسائر / تسوية مخزون',
    debit: 1200,
    credit: 0,
    status: 'suggested',
    description: 'قيد تسوية آلي مقترح من نظام التدقيق الذكي'
  };
  db.closing_adjustments.push(newAdj);
  saveLocalDatabase(db);
  res.json({ success: true, message: 'تم توليد قيود التسوية المقترحة بنجاح' });
});

router.put('/closing/adjustment/:id/status', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  ensureAuditCollections(db);
  const { id } = req.params;
  const { status } = req.body;
  const adj = (db.closing_adjustments || []).find((a: any) => String(a.id) === String(id));
  if (!adj) {
    return res.status(404).json({ error: 'القيد غير موجود' });
  }
  adj.status = status;
  saveLocalDatabase(db);
  res.json({ success: true, message: 'تم تحديث حالة القيد بنجاح' });
});

router.post('/closing/:id/close', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  ensureAuditCollections(db);
  const { id } = req.params;
  const period = (db.closing_periods || []).find((p: any) => String(p.id) === String(id));
  if (!period) {
    return res.status(404).json({ error: 'الدورة غير موجودة' });
  }
  period.status = 'closed';
  period.closed_at = new Date().toISOString();
  saveLocalDatabase(db);
  res.json({ success: true, message: 'تم إغلاق وتأمين الدورة المحاسبية بنجاح نهائي' });
});

export default router;
