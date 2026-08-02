import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const DB_FILE = path.join(process.cwd(), 'database.json');

// Read database helper
function getLocalDatabase(): any {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading local database in anomaly router:', e);
  }
  return {};
}

// Save database helper
function saveLocalDatabase(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing local database in anomaly router:', e);
  }
}

// 1. GET /api/anomaly/detections - قائمة كشوفات الشذوذ
router.get('/detections', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  let detections = db.anomaly_detection || [];

  const { severity, status, type } = req.query;

  if (severity) {
    detections = detections.filter((d: any) => d.severity === severity);
  }
  if (status) {
    detections = detections.filter((d: any) => d.status === status);
  }
  if (type) {
    detections = detections.filter((d: any) => d.anomaly_type === type);
  }

  // Sort descending by id or created_at
  detections = [...detections].sort((a: any, b: any) => b.id - a.id);

  res.json(detections);
});

// 2. PUT /api/anomaly/detections/:id/status - تحديث حالة كشف الشذوذ
router.put('/detections/:id/status', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  const detections = db.anomaly_detection || [];
  const { id } = req.params;
  const { status, notes } = req.body;

  const idx = detections.findIndex((d: any) => String(d.id) === String(id));
  if (idx === -1) {
    return res.status(404).json({ error: 'لم يتم العثور على كشف الشذوذ' });
  }

  detections[idx].status = status;
  if (notes !== undefined) {
    detections[idx].notes = notes;
  }
  detections[idx].updated_at = new Date().toISOString();

  db.anomaly_detection = detections;
  saveLocalDatabase(db);

  res.json({ message: 'تم تحديث حالة كشف الشذوذ بنجاح', detection: detections[idx] });
});

// 3. GET /api/anomaly/rules - قائمة قواعد كشف الشذوذ
router.get('/rules', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  res.json(db.anomaly_rules || []);
});

// 4. POST /api/anomaly/rules - إضافة قاعدة كشف شذوذ جديدة
router.post('/rules', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  const rules = db.anomaly_rules || [];
  const { name, description, rule_type, severity, conditions } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'الرجاء ملء اسم القاعدة' });
  }

  const newRule = {
    id: rules.length > 0 ? Math.max(...rules.map((r: any) => r.id)) + 1 : 1,
    name,
    description: description || '',
    rule_type: rule_type || 'pattern',
    severity: severity || 'medium',
    conditions: conditions || {},
    is_active: true,
    created_at: new Date().toISOString()
  };

  db.anomaly_rules = [...rules, newRule];
  saveLocalDatabase(db);

  res.status(201).json(newRule);
});

// 5. DELETE /api/anomaly/rules/:id - حذف قاعدة كشف شذوذ
router.delete('/rules/:id', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  const rules = db.anomaly_rules || [];
  const { id } = req.params;

  const filteredRules = rules.filter((r: any) => String(r.id) !== String(id));
  if (filteredRules.length === rules.length) {
    return res.status(404).json({ error: 'القاعدة غير موجودة' });
  }

  db.anomaly_rules = filteredRules;
  saveLocalDatabase(db);

  res.json({ success: true, message: 'تم حذف القاعدة بنجاح' });
});

// 6. POST /api/anomaly/run-detection - تشغيل فحص يدوي للكشف عن الشذوذ
router.post('/run-detection', (req: Request, res: Response) => {
  const db = getLocalDatabase();
  const detections = db.anomaly_detection || [];
  const invoices = db.invoices || [];

  // Let's run a simple mock checks to see if duplicate invoices exist
  const newDetections: any[] = [];
  
  // Find duplicate invoices by number
  const seenNumbers: Record<string, any[]> = {};
  invoices.forEach((inv: any) => {
    if (inv.invoice_number) {
      if (!seenNumbers[inv.invoice_number]) {
        seenNumbers[inv.invoice_number] = [];
      }
      seenNumbers[inv.invoice_number].push(inv);
    }
  });

  let duplicateFound = false;
  Object.entries(seenNumbers).forEach(([invNo, invList]) => {
    if (invList.length > 1) {
      // Check if we already have this detection
      const existing = detections.find((d: any) => d.anomaly_type === 'duplicate_invoice' && d.details?.invoice_number === invNo);
      if (!existing) {
        duplicateFound = true;
        const mainInv = invList[0];
        const nextId = detections.length + newDetections.length + 1;
        newDetections.push({
          id: nextId,
          anomaly_type: 'duplicate_invoice',
          severity: 'high',
          description: `تم اكتشاف فواتير مكررة برقم '${invNo}' للعميل ${mainInv.client_name || 'غير معروف'} بقيمة ${mainInv.total || 0} ج.م`,
          details: {
            invoice_number: invNo,
            count: invList.length,
            ids: invList.map((i: any) => i.id).join(', ')
          },
          reference_type: 'invoice',
          reference_id: mainInv.id,
          status: 'pending',
          created_at: new Date().toISOString()
        });
      }
    }
  });

  if (newDetections.length > 0) {
    db.anomaly_detection = [...newDetections, ...detections];
    saveLocalDatabase(db);
  }

  res.json({
    message: newDetections.length > 0 
      ? `اكتمل الفحص بنجاح! تم العثور على ${newDetections.length} حالات شذوذ جديدة.` 
      : 'اكتمل الفحص بنجاح! لم يتم العثور على أي حالات شذوذ جديدة.'
  });
});

export default router;
