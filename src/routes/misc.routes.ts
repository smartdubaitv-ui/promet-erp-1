import { Router, Request, Response } from 'express';
import { firestore, isFirebaseConnected } from '../../services/firebase.service';
import { isPostgresConnected } from '../../services/postgres.service';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { seedDemoData, clearDemoData } from '../controllers/demo.controller';
import { TreasuryService } from '../services/treasury.service';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import { sendEmail } from '../services/email.service';
import { generateQuotationPdfBuffer } from '../services/pdf.service';

const router = Router();
const DB_FILE = path.join(process.cwd(), 'database.json');

// Direct Demo Data routes for guaranteed reliability
router.post('/seed-demo-data', seedDemoData);
router.post('/clear-demo-data', clearDemoData);
router.post('/admin/seed-demo-data', seedDemoData);
router.post('/admin/clear-demo-data', clearDemoData);

// Database health check endpoint
router.get('/db-health', (req: Request, res: Response) => {
  try {
    const dbFileExists = fs.existsSync(DB_FILE);
    let stats = {};
    if (dbFileExists) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      stats = {
        employees: data.employees?.length || 0,
        invoices: data.invoices?.length || 0,
        payroll: data.payroll?.length || 0,
        products: data.products?.length || 0,
        contacts: data.contacts?.length || 0,
      };
    }
    return res.json({
      status: 'ok',
      databaseFile: dbFileExists ? 'accessible' : 'missing',
      firebaseConnected: isFirebaseConnected(),
      postgresConnected: isPostgresConnected(),
      stats
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

// Initialize Gemini SDK with lazy key resolution
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.error('Failed to initialize GoogleGenAI client:', e);
    }
  }
  return aiClient;
}

// Read database.json helper
function getLocalDatabase(): any {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading local database.json in misc router:', e);
  }
  return {};
}

// Save database.json helper
function saveLocalDatabase(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing local database.json in misc router:', e);
  }
}

// Recalculate balances
function performFintechRecalculation() {
  const db = getLocalDatabase();
  const contacts = db.contacts || [];
  const invoices = db.invoices || [];
  const expenses = db.expenses || [];
  
  contacts.forEach((contact: any) => {
    if (contact.type === "customer") {
      const unpaidSum = invoices
        .filter((inv: any) => inv.contactId === contact.id)
        .reduce((sum: number, inv: any) => sum + ((inv.totalAmount || 0) - (inv.paidAmount || 0)), 0);
      contact.balance = unpaidSum;
    } else {
      const expenseSum = expenses
        .filter((exp: any) => exp.contactId === contact.id)
        .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
      contact.balance = Math.max(0, expenseSum);
    }
  });

  const todayStr = new Date().toISOString().split("T")[0];
  invoices.forEach((inv: any) => {
    if (inv.status !== "paid" && inv.status !== "draft") {
      if (inv.dueDate < todayStr) {
        inv.status = "overdue";
      } else {
        inv.status = "unpaid";
      }
    }
  });

  saveLocalDatabase(db);
}

// ----------------------------------------------------
// Public Endpoints
// ----------------------------------------------------

// API Health Check
router.get('/health', (req, res) => {
  const firebaseStatus = isFirebaseConnected() ? '✅ Connected' : '❌ Not Connected';
  res.json({ 
    status: 'OK', 
    firebase: firebaseStatus,
    database: firebaseStatus === '✅ Connected' ? 'Firebase' : 'JSON (Local)'
  });
});

// GET /api/languages
router.get('/languages', (req, res) => {
  res.json([
    { code: 'ar', name: 'العربية', direction: 'rtl' },
    { code: 'en', name: 'English', direction: 'ltr' }
  ]);
});

// GET /api/language
router.get('/language', (req, res) => {
  const db = getLocalDatabase();
  res.json({ current: db.settings?.default_language || 'ar' });
});

// POST /api/language
router.post('/language', (req, res) => {
  const { code } = req.body;
  if (!['ar', 'en'].includes(code)) {
    return res.status(400).json({ error: 'لغة غير مدعومة' });
  }
  const db = getLocalDatabase();
  if (!db.settings) db.settings = {};
  db.settings.default_language = code;
  saveLocalDatabase(db);
  res.json({ success: true, language: code });
});

// GET /api/translations/:lang
router.get('/translations/:lang', (req, res) => {
  const { lang } = req.params;
  const db = getLocalDatabase();
  const translations = db.translations?.[lang] || {};
  res.json(translations);
});

// GET /api/export-zip - تصدير الكود المصدري كاملاً كملف مضغوط
router.get('/export-zip', (req, res) => {
  try {
    const zip = new AdmZip();

    // Directories to include in the ZIP package
    const foldersToInclude = ['src', 'services', 'scripts', 'locales', 'assets'];
    for (const folder of foldersToInclude) {
      const folderPath = path.join(process.cwd(), folder);
      if (fs.existsSync(folderPath)) {
        zip.addLocalFolder(folderPath, folder);
      }
    }

    // Individual files to include in the ZIP package
    const filesToInclude = [
      'server.ts',
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'vite.config.ts',
      'index.html',
      'database.json',
      'DEVELOPER_GUIDE.md',
      'README.md',
      '.env.example',
      '.gitignore',
      'Dockerfile',
      'docker-compose.yml',
      'admin_dashboard.html',
      'welcome.html',
      'employee_portal.html',
      'metadata.json',
      'firestore.rules',
      'firebase.json',
      'firebase-blueprint.json',
      'migrate-to-firestore.ts',
      'jest.config.js'
    ];

    for (const file of filesToInclude) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        zip.addLocalFile(filePath);
      }
    }

    const zipBuffer = zip.toBuffer();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=promet-erp-source.zip');
    res.send(zipBuffer);
  } catch (error: any) {
    console.error('Error generating source code ZIP archive:', error);
    res.status(500).json({ error: 'فشل في إنشاء ملف الكود المصدري المضغوط: ' + error.message });
  }
});

// ----------------------------------------------------
// Authenticated Endpoints (General)
// ----------------------------------------------------
router.use(authenticate);

// Generated random default admin password fallback if not set in process.env
const getDefaultAdminPassword = (): string => {
  const envPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  if (envPassword) {
    return envPassword;
  }
  const globalAny: any = global;
  if (!globalAny.generatedDefaultAdminPassword) {
    globalAny.generatedDefaultAdminPassword = crypto.randomBytes(16).toString('hex');
  }
  return globalAny.generatedDefaultAdminPassword;
};

// GET /api/users - جلب كافة المستخدمين (للمدراء فقط)
router.get('/users', (req, res) => {
  const db = getLocalDatabase();
  const defaultTasksForRole = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'hr': return ['hr'];
      case 'scrap': return ['scrap'];
      case 'accountant': return ['sales_invoices', 'expenses_finance', 'reports'];
      case 'sales': return ['sales_invoices', 'crm'];
      case 'warehouse': return ['inventory', 'scrap'];
      case 'admin':
      default:
        return ['hr', 'scrap', 'sales_invoices', 'inventory', 'expenses_finance', 'reports', 'projects', 'assets', 'audit', 'settings'];
    }
  };

  const usersWithDetails = (db.users || [])
    .map((user: any) => {
      const roleObj = (db.roles || []).find((r: any) => Number(r.id) === Number(user.role_id));
      const empObj = (db.employees || []).find((e: any) => String(e.id) === String(user.employee_id));
      const tasks = user.assigned_tasks && Array.isArray(user.assigned_tasks) && user.assigned_tasks.length > 0 
        ? user.assigned_tasks 
        : defaultTasksForRole(user.role);
      return {
        ...user,
        role_name: roleObj ? roleObj.name : (user.role || 'employee'),
        role_description: roleObj ? roleObj.description : '',
        employee_name: empObj ? empObj.name : null,
        assigned_tasks: tasks,
        custom_role_name: user.custom_role_name || user.role,
        is_active: user.is_active !== undefined ? user.is_active : (user.isActive !== undefined ? user.isActive : true)
      };
    });
  res.json(usersWithDetails);
});

// POST /api/users - إضافة مستخدم جديد (للمدراء فقط)
router.post('/users', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { name, email, role, assigned_tasks, custom_role_name } = req.body;
  if (!email) {
    return res.status(400).json({ error: "البريد الإلكتروني حقل إلزامي" });
  }
  const db = getLocalDatabase();

  const defaultTasksForRole = (r: string) => {
    switch (r?.toLowerCase()) {
      case 'hr': return ['hr'];
      case 'scrap': return ['scrap'];
      case 'accountant': return ['sales_invoices', 'expenses_finance', 'reports'];
      case 'sales': return ['sales_invoices', 'crm'];
      case 'warehouse': return ['inventory', 'scrap'];
      case 'admin':
      default:
        return ['hr', 'scrap', 'sales_invoices', 'inventory', 'expenses_finance', 'reports', 'projects', 'assets', 'audit', 'settings'];
    }
  };

  const newUser = {
    id: `u-${Date.now()}`,
    tenantId: tenantId,
    email,
    name: name || email.split('@')[0],
    username: email.split('@')[0],
    password_hash: bcrypt.hashSync(getDefaultAdminPassword(), 10),
    role: role || "employee",
    role_id: role === "admin" ? 1 : role === "hr" ? 2 : role === "manager" ? 3 : 4,
    assigned_tasks: Array.isArray(assigned_tasks) && assigned_tasks.length > 0 ? assigned_tasks : defaultTasksForRole(role),
    custom_role_name: custom_role_name || role,
    isActive: true,
    is_active: true,
    last_login: null,
    createdAt: new Date().toISOString()
  };
  if (!db.users) db.users = [];
  db.users.push(newUser);
  saveLocalDatabase(db);
  res.status(201).json(newUser);
});

// PUT /api/users/:id - تحديث بيانات مستخدم
router.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, role, isActive, is_active, assigned_tasks, custom_role_name } = req.body;
  const db = getLocalDatabase();
  if (!db.users) db.users = [];
  const idx = db.users.findIndex((u: any) => String(u.id) === String(id));
  if (idx === -1) return res.status(404).json({ error: "المستخدم غير موجود" });

  const activeStatus = is_active !== undefined ? is_active : (isActive !== undefined ? isActive : db.users[idx].is_active);

  db.users[idx] = { 
    ...db.users[idx], 
    name: name !== undefined ? name : db.users[idx].name, 
    email: email !== undefined ? email : db.users[idx].email, 
    role: role !== undefined ? role : db.users[idx].role, 
    role_id: role === "admin" ? 1 : role === "hr" ? 2 : role === "manager" ? 3 : (db.users[idx].role_id || 4),
    assigned_tasks: Array.isArray(assigned_tasks) ? assigned_tasks : db.users[idx].assigned_tasks,
    custom_role_name: custom_role_name !== undefined ? custom_role_name : db.users[idx].custom_role_name,
    isActive: activeStatus,
    is_active: activeStatus
  };
  saveLocalDatabase(db);
  res.json(db.users[idx]);
});

// PUT /api/users/:id/tasks - تحديث مهام موظف محدد
router.put('/users/:id/tasks', (req, res) => {
  const { id } = req.params;
  const { assigned_tasks, custom_role_name, role } = req.body;
  const db = getLocalDatabase();
  if (!db.users) db.users = [];
  const idx = db.users.findIndex((u: any) => String(u.id) === String(id));
  if (idx === -1) return res.status(404).json({ error: "المستخدم غير موجود" });

  db.users[idx] = {
    ...db.users[idx],
    assigned_tasks: Array.isArray(assigned_tasks) ? assigned_tasks : db.users[idx].assigned_tasks,
    custom_role_name: custom_role_name || db.users[idx].custom_role_name,
    role: role || db.users[idx].role
  };
  saveLocalDatabase(db);
  res.json({ success: true, message: "تم تحديث مهام وأدوار الموظف بنجاح", user: db.users[idx] });
});

// DELETE /api/users/:id - حذف مستخدم
router.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  const db = getLocalDatabase();
  if (!db.users) db.users = [];
  const initialLen = db.users.length;
  db.users = db.users.filter((u: any) => String(u.id) !== String(id));
  if (db.users.length === initialLen) {
    return res.status(404).json({ error: "المستخدم غير موجود" });
  }
  saveLocalDatabase(db);
  res.json({ success: true, message: "تم حذف حساب المستخدم بنجاح" });
});

// PUT /api/users/:id/toggle - تفعيل / تعطيل مستخدم (للمدراء فقط)
router.put('/users/:id/toggle', authorize('admin'), (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  const { is_active } = req.body;
  const db = getLocalDatabase();
  if (!db.users) db.users = [];
  const idx = db.users.findIndex((u: any) => String(u.id) === String(id) && u.tenantId === tenantId);
  if (idx === -1) return res.status(404).json({ error: "المستخدم غير موجود أو لا ينتمي لهذا المستأجر" });

  db.users[idx].is_active = !!is_active;
  db.users[idx].isActive = !!is_active; // backward compatibility
  saveLocalDatabase(db);
  res.json({ success: true, message: "تم تحديث حالة المستخدم بنجاح" });
});

// GET /api/tenant
router.get('/tenant', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  const t = (db.tenants || []).find((x: any) => x.id === tenantId) || { id: tenantId, name: "شركة الهضبة للحلول التقنية", plan: "pro" };
  const limits = {
    usersLimit: t.plan === "basic" ? 1 : t.plan === "pro" ? 5 : 9999,
    invoicesLimit: t.plan === "basic" ? 15 : t.plan === "pro" ? 500 : 99999,
    currentUsersCount: (db.users || []).filter((u: any) => u.tenantId === tenantId && (u.isActive || u.is_active)).length,
    currentInvoicesCount: (db.invoices || []).filter((inv: any) => inv.tenantId === tenantId).length,
  };
  res.json({ ...t, limits });
});

// POST /api/tenant/plan
router.post('/tenant/plan', authorize('admin', 'manager'), (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { plan } = req.body;
  if (!["basic", "pro", "enterprise"].includes(plan)) {
    return res.status(400).json({ error: "خطأ في اختيار الباقة" });
  }
  const db = getLocalDatabase();
  if (!db.tenants) db.tenants = [];
  let tenant = db.tenants.find((t: any) => t.id === tenantId);
  if (!tenant) {
    tenant = { id: tenantId, name: "شركة الهضبة للحلول التقنية", plan };
    db.tenants.push(tenant);
  } else {
    tenant.plan = plan;
  }
  saveLocalDatabase(db);
  res.json({ success: true, plan });
});

// GET /api/roles
router.get('/roles', (req, res) => {
  const db = getLocalDatabase();
  res.json(db.roles || [
    { id: 1, name: 'admin', description: 'مدير النظام' },
    { id: 2, name: 'hr', description: 'مسؤول الموارد البشرية' },
    { id: 3, name: 'manager', description: 'مدير مالي' },
    { id: 4, name: 'employee', description: 'موظف' }
  ]);
});

// GET /api/departments
router.get('/departments', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  if (!db.departments || db.departments.length === 0) {
    db.departments = [
      { id: 'dept-1', tenantId, name: 'الإدارة العامة' },
      { id: 'dept-2', tenantId, name: 'المبيعات والتسويق' },
      { id: 'dept-3', tenantId, name: 'المشتريات والخدمات اللوجستية' },
      { id: 'dept-4', tenantId, name: 'المخازن والمستودعات' },
      { id: 'dept-5', tenantId, name: 'المحاسبة والمالية' },
      { id: 'dept-6', tenantId, name: 'الموارد البشرية' },
      { id: 'dept-7', tenantId, name: 'الجودة والسلامة المهنية' },
      { id: 'dept-8', tenantId, name: 'تكنولوجيا المعلومات' },
    ];
    saveLocalDatabase(db);
  }
  const items = (db.departments || []).filter((d: any) => !d.tenantId || d.tenantId === tenantId || tenantId === 'tenant-promet-sa');
  res.json(items);
});

// POST /api/departments
router.post('/departments', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { name } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "اسم القسم مطلوب" });
  }
  const trimmed = String(name).trim();
  const db = getLocalDatabase();
  if (!db.departments) db.departments = [];
  
  const existing = db.departments.find((d: any) => d.name === trimmed);
  if (existing) {
    return res.json(existing);
  }

  const newDept = {
    id: `dept-${Date.now()}`,
    tenantId,
    name: trimmed
  };
  db.departments.push(newDept);
  saveLocalDatabase(db);
  res.status(201).json(newDept);
});

// DELETE /api/departments/:id
router.delete('/departments/:id', (req, res) => {
  const { id } = req.params;
  const db = getLocalDatabase();
  if (!db.departments) db.departments = [];
  db.departments = db.departments.filter((d: any) => String(d.id) !== String(id) && d.name !== id);
  saveLocalDatabase(db);
  res.json({ success: true });
});

// GET /api/positions
router.get('/positions', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  if (!db.positions || db.positions.length === 0) {
    db.positions = [
      { id: 'pos-1', tenantId, name: 'مدير عام' },
      { id: 'pos-2', tenantId, name: 'مدير موارد بشرية' },
      { id: 'pos-3', tenantId, name: 'محاسب عام' },
      { id: 'pos-4', tenantId, name: 'أمين مخزن' },
      { id: 'pos-5', tenantId, name: 'مسؤول مبيعات' },
      { id: 'pos-6', tenantId, name: 'مهندس جودة' },
      { id: 'pos-7', tenantId, name: 'سائق معدات' },
      { id: 'pos-8', tenantId, name: 'عامل تشغيل' },
    ];
    saveLocalDatabase(db);
  }
  const items = (db.positions || []).filter((p: any) => !p.tenantId || p.tenantId === tenantId || tenantId === 'tenant-promet-sa');
  res.json(items);
});

// POST /api/positions
router.post('/positions', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { name } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "المسمى الوظيفي مطلوب" });
  }
  const trimmed = String(name).trim();
  const db = getLocalDatabase();
  if (!db.positions) db.positions = [];

  const existing = db.positions.find((p: any) => p.name === trimmed);
  if (existing) {
    return res.json(existing);
  }

  const newPos = {
    id: `pos-${Date.now()}`,
    tenantId,
    name: trimmed
  };
  db.positions.push(newPos);
  saveLocalDatabase(db);
  res.status(201).json(newPos);
});

// DELETE /api/positions/:id
router.delete('/positions/:id', (req, res) => {
  const { id } = req.params;
  const db = getLocalDatabase();
  if (!db.positions) db.positions = [];
  db.positions = db.positions.filter((p: any) => String(p.id) !== String(id) && p.name !== id);
  saveLocalDatabase(db);
  res.json({ success: true });
});

// GET /api/accounts
router.get('/accounts', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  res.json((db.accounts || []).filter((a: any) => a.tenantId === tenantId));
});

// POST /api/accounts
router.post('/accounts', authorize('admin', 'manager'), (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { code, name, type, parentId } = req.body;
  if (!code || !name || !type) {
    return res.status(400).json({ error: "يرجى تعبئة الحقول الأساسية للحساب المحاسبي" });
  }
  const db = getLocalDatabase();
  if (!db.accounts) db.accounts = [];
  const newAccount = {
    id: `acc-${Date.now()}`,
    tenantId,
    code,
    name,
    type,
    parentId,
    isActive: true,
    balance: 0
  };
  db.accounts.push(newAccount);
  saveLocalDatabase(db);
  res.status(201).json(newAccount);
});

// GET /api/contacts
router.get('/contacts', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  performFintechRecalculation();
  const db = getLocalDatabase();
  res.json((db.contacts || []).filter((c: any) => c.tenantId === tenantId));
});

// POST /api/contacts
router.post('/contacts', authorize('admin', 'manager', 'sales'), (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { type, name, email, phone, address } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: "اسم جهة الاتصال والنوع حقول إلزامية" });
  }
  const db = getLocalDatabase();
  if (!db.contacts) db.contacts = [];
  const newContact = {
    id: `con-${Date.now()}`,
    tenantId,
    type,
    name,
    email: email || '',
    phone: phone || '',
    address: address || '',
    balance: 0,
    createdAt: new Date().toISOString()
  };
  db.contacts.push(newContact);
  saveLocalDatabase(db);
  res.status(201).json(newContact);
});

// PUT /api/contacts/:id
router.put('/contacts/:id', authorize('admin', 'manager', 'sales'), (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  const { name, email, phone, address, type } = req.body;
  const db = getLocalDatabase();
  if (!db.contacts) db.contacts = [];
  const idx = db.contacts.findIndex((c: any) => c.id === id && c.tenantId === tenantId);
  if (idx === -1) return res.status(404).json({ error: "جهة الاتصال غير موجودة أو لا تملك الصلاحية لتعديلها" });

  db.contacts[idx] = { ...db.contacts[idx], name, email, phone, address, type };
  saveLocalDatabase(db);
  res.json(db.contacts[idx]);
});

// DELETE /api/contacts/:id
router.delete('/contacts/:id', authorize('admin', 'manager'), (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  const db = getLocalDatabase();
  if (!db.contacts) db.contacts = [];
  const idx = db.contacts.findIndex((c: any) => c.id === id && c.tenantId === tenantId);
  if (idx === -1) return res.status(404).json({ error: "جهة الاتصال غير موجودة أو لا تملك الصلاحية لحذفها" });

  db.contacts.splice(idx, 1);
  saveLocalDatabase(db);
  res.json({ success: true, message: "تم حذف جهة الاتصال بنجاح" });
});

// GET /api/expenses
router.get('/expenses', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  res.json((db.expenses || []).filter((e: any) => e.tenantId === tenantId));
});

// POST /api/expenses
router.post('/expenses', async (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { contactId, expenseDate, expense_date, amount, category, department, description, payee, receiptUrl, payment_method, activity, notes, vaultId, vault_id } = req.body;
  const targetVaultId = vaultId || vault_id;
  const finalDate = expense_date || expenseDate || new Date().toISOString().split('T')[0];

  if (!finalDate || !amount || !category) {
    return res.status(400).json({ error: "تاريخ المصروف، القيمة، والتصنيف حقول إلزامية" });
  }

  if (!targetVaultId) {
    return res.status(400).json({ error: "الخزينة (vaultId) حقل إلزامي لخصم قيمة المصروف" });
  }

  // Deduct amount from Treasury vault via payment voucher
  let voucherResult: any = null;
  try {
    voucherResult = await TreasuryService.createPaymentVoucher(tenantId, (req as any).user, {
      vault_id: targetVaultId,
      amount: Number(amount),
      date: finalDate,
      type: 'operational_expense',
      notes: notes || description || `مصروف: ${category}`,
      contact_id: contactId,
      contact_name: payee
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || "فشلت عملية خصم المصروف من الخزينة" });
  }

  const db = getLocalDatabase();
  if (!db.expenses) db.expenses = [];
  const newExpense = {
    id: `exp-${Date.now()}`,
    tenantId,
    contactId,
    vaultId: targetVaultId,
    vault_id: targetVaultId,
    voucherId: voucherResult?.voucher?.id,
    voucherNumber: voucherResult?.voucher?.voucher_number,
    expenseDate: finalDate,
    expense_date: finalDate,
    amount: Number(amount),
    category,
    department: department || 'قسم ميزان البسكول',
    description: description || '',
    payee: payee || '',
    payment_method: payment_method || 'cash',
    activity: activity || 'general',
    receiptUrl: receiptUrl || '',
    notes: notes || '',
    createdAt: new Date().toISOString()
  };
  db.expenses.push(newExpense);

  if (!db.accounts) db.accounts = [];
  const expAcc = db.accounts.find((a: any) => a.name === category && a.tenantId === tenantId);
  if (expAcc) expAcc.balance += Number(amount);

  saveLocalDatabase(db);
  performFintechRecalculation();
  res.status(201).json(newExpense);
});

// PUT /api/expenses/:id
router.put('/expenses/:id', authorize('admin'), (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  const db = getLocalDatabase();
  if (!db.expenses) db.expenses = [];
  const idx = db.expenses.findIndex((e: any) => String(e.id) === String(id) && e.tenantId === tenantId);
  if (idx === -1) {
    return res.status(404).json({ error: "المصروف غير موجود" });
  }

  const { amount, category, department, description, payee, payment_method, expense_date, expenseDate, notes } = req.body;
  const finalDate = expense_date || expenseDate || db.expenses[idx].expenseDate || db.expenses[idx].expense_date;

  db.expenses[idx] = {
    ...db.expenses[idx],
    expenseDate: finalDate,
    expense_date: finalDate,
    amount: amount ? Number(amount) : db.expenses[idx].amount,
    category: category || db.expenses[idx].category,
    department: department || db.expenses[idx].department,
    description: description !== undefined ? description : db.expenses[idx].description,
    payee: payee !== undefined ? payee : db.expenses[idx].payee,
    payment_method: payment_method || db.expenses[idx].payment_method,
    notes: notes !== undefined ? notes : db.expenses[idx].notes,
    updatedAt: new Date().toISOString()
  };

  saveLocalDatabase(db);
  performFintechRecalculation();
  res.json({ success: true, message: "تم تعديل المصروف بنجاح", expense: db.expenses[idx] });
});

// DELETE /api/expenses/:id
router.delete('/expenses/:id', authorize('admin', 'manager', 'warehouse', 'accountant'), async (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;

  try {
    if (isFirebaseConnected() && firestore) {
      try {
        await firestore.collection('expenses').doc(String(id)).delete();
      } catch (e) {
        console.error('Firestore delete error for expense:', e);
      }
    }

    const db = getLocalDatabase();
    if (db.expenses && Array.isArray(db.expenses)) {
      db.expenses = db.expenses.filter((e: any) => String(e.id) !== String(id));
      saveLocalDatabase(db);
    }

    performFintechRecalculation();
    res.json({ success: true, message: "🗑️ تم حذف المصروف بنجاح" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "فشل حذف المصروف" });
  }
});


// GET /api/leaves
router.get('/leaves', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  res.json((db.leaves || []).filter((l: any) => l.tenantId === tenantId));
});

// POST /api/leaves
router.post('/leaves', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { employeeId, leaveType, startDate, endDate, reason } = req.body;
  if (!employeeId || !leaveType || !startDate || !endDate) {
    return res.status(400).json({ error: "جميع الحقول الأساسية للإجازة مطلوبة" });
  }
  const db = getLocalDatabase();
  if (!db.leaves) db.leaves = [];
  const newLeave = {
    id: `lv-${Date.now()}`,
    tenantId,
    employeeId,
    leaveType,
    startDate,
    endDate,
    reason,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  db.leaves.push(newLeave);
  saveLocalDatabase(db);
  res.status(201).json(newLeave);
});

// PUT /api/leaves/:id/status
router.put('/leaves/:id/status', authorize('admin', 'hr'), (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  const { status } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: "حالة إجازة غير صالحة" });
  }
  const db = getLocalDatabase();
  if (!db.leaves) db.leaves = [];
  const idx = db.leaves.findIndex((l: any) => l.id === id && l.tenantId === tenantId);
  if (idx === -1) return res.status(404).json({ error: "الإجازة غير موجودة أو لا تملك الصلاحية لتعديلها" });

  db.leaves[idx].status = status;
  saveLocalDatabase(db);
  res.json(db.leaves[idx]);
});

// PUT /api/leaves/:id
router.put('/leaves/:id', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  const { leaveType, startDate, endDate, reason } = req.body;
  const db = getLocalDatabase();
  if (!db.leaves) db.leaves = [];
  const idx = db.leaves.findIndex((l: any) => l.id === id && l.tenantId === tenantId);
  if (idx === -1) return res.status(404).json({ error: "الإجازة غير موجودة أو لا تملك الصلاحية لتعديلها" });

  db.leaves[idx] = { ...db.leaves[idx], leaveType, startDate, endDate, reason };
  saveLocalDatabase(db);
  res.json(db.leaves[idx]);
});

// DELETE /api/leaves/:id
router.delete('/leaves/:id', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  const db = getLocalDatabase();
  if (!db.leaves) db.leaves = [];
  const idx = db.leaves.findIndex((l: any) => l.id === id && l.tenantId === tenantId);
  if (idx === -1) return res.status(404).json({ error: "الإجازة غير موجودة أو لا تملك الصلاحية لحذفها" });

  db.leaves.splice(idx, 1);
  saveLocalDatabase(db);
  res.json({ success: true });
});

// GET /api/attendance
router.get('/attendance', async (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { date } = req.query;
  try {
    if (isFirebaseConnected() && firestore) {
      let q: any = firestore.collection('attendance').where('tenantId', '==', tenantId);
      if (date) {
        q = q.where('date', '==', date);
      }
      const snapshot = await q.get();
      const records = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      return res.json(records);
    } else {
      const db = getLocalDatabase();
      let records = (db.attendance || []).filter((a: any) => a.tenantId === tenantId);
      if (date) {
        records = records.filter((a: any) => a.date === date);
      }
      return res.json(records);
    }
  } catch (error: any) {
    console.error('Error fetching attendance:', error);
    return res.status(500).json({ error: 'فشل جلب بيانات الحضور' });
  }
});

// POST /api/attendance
router.post('/attendance', async (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { date, records, employeeId, status, checkIn, checkOut, notes, overtimeHours } = req.body;

  try {
    if (records && Array.isArray(records)) {
      // Bulk save / Batch save
      const targetDate = date || new Date().toISOString().split('T')[0];

      if (isFirebaseConnected() && firestore) {
        const batch = firestore.batch();
        const attendanceCol = firestore.collection('attendance');

        // Fetch existing records for this date and tenant to update them rather than duplicate
        const existingSnap = await attendanceCol
          .where('tenantId', '==', tenantId)
          .where('date', '==', targetDate)
          .get();

        const existingDocsMap = new Map<string, string>(); // employeeId -> docId
        existingSnap.docs.forEach((doc: any) => {
          const data = doc.data();
          const empId = data.employeeId || data.employee_id;
          if (empId) {
            existingDocsMap.set(String(empId), doc.id);
          }
        });

        for (const record of records) {
          const empId = record.employee_id || record.employeeId;
          if (!empId) continue;

          const attendanceData = {
            tenantId,
            date: targetDate,
            employeeId: empId,
            employee_id: empId,
            employeeName: record.employee_name || record.employeeName || '',
            employee_name: record.employee_name || record.employeeName || '',
            checkIn: record.check_in || record.checkIn || '',
            check_in: record.check_in || record.checkIn || '',
            checkOut: record.check_out || record.checkOut || '',
            check_out: record.check_out || record.checkOut || '',
            status: record.status || 'absent',
            notes: record.notes || '',
            overtimeHours: Number(record.overtime_hours !== undefined ? record.overtime_hours : (record.overtimeHours || 0)),
            overtime_hours: Number(record.overtime_hours !== undefined ? record.overtime_hours : (record.overtimeHours || 0)),
            updatedAt: new Date().toISOString()
          };

          const existingDocId = existingDocsMap.get(String(empId));
          if (existingDocId) {
            const docRef = attendanceCol.doc(existingDocId);
            batch.set(docRef, attendanceData, { merge: true });
          } else {
            const docRef = attendanceCol.doc();
            batch.set(docRef, {
              id: docRef.id,
              createdAt: new Date().toISOString(),
              ...attendanceData
            });
          }
        }

        await batch.commit();
        return res.json({ success: true, message: "تم حفظ سجلات الحضور بنجاح" });
      } else {
        const db = getLocalDatabase();
        if (!db.attendance) db.attendance = [];

        for (const record of records) {
          const empId = record.employee_id || record.employeeId;
          if (!empId) continue;

          const attendanceData = {
            tenantId,
            date: targetDate,
            employeeId: empId,
            employee_id: empId,
            employeeName: record.employee_name || record.employeeName || '',
            employee_name: record.employee_name || record.employeeName || '',
            checkIn: record.check_in || record.checkIn || '',
            check_in: record.check_in || record.checkIn || '',
            checkOut: record.check_out || record.checkOut || '',
            check_out: record.check_out || record.checkOut || '',
            status: record.status || 'absent',
            notes: record.notes || '',
            overtimeHours: Number(record.overtime_hours !== undefined ? record.overtime_hours : (record.overtimeHours || 0)),
            overtime_hours: Number(record.overtime_hours !== undefined ? record.overtime_hours : (record.overtimeHours || 0)),
            updatedAt: new Date().toISOString()
          };

          const existingIdx = db.attendance.findIndex((a: any) => 
            a.tenantId === tenantId && 
            a.date === targetDate && 
            String(a.employeeId || a.employee_id) === String(empId)
          );

          if (existingIdx > -1) {
            db.attendance[existingIdx] = {
              ...db.attendance[existingIdx],
              ...attendanceData
            };
          } else {
            db.attendance.push({
              id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              createdAt: new Date().toISOString(),
              ...attendanceData
            });
          }
        }

        saveLocalDatabase(db);
        return res.json({ success: true, message: "تم حفظ سجلات الحضور بنجاح" });
      }
    } else {
      // Single record save
      const targetEmployeeId = employeeId || req.body.employee_id;
      const targetDate = date || new Date().toISOString().split('T')[0];
      const targetStatus = status || 'absent';

      if (!targetEmployeeId || !targetStatus) {
        return res.status(400).json({ error: "المعرف والحالة حقول إلزامية" });
      }

      const attendanceData = {
        tenantId,
        date: targetDate,
        employeeId: targetEmployeeId,
        employee_id: targetEmployeeId,
        checkIn: checkIn || req.body.check_in || '',
        check_in: checkIn || req.body.check_in || '',
        checkOut: checkOut || req.body.check_out || '',
        check_out: checkOut || req.body.check_out || '',
        status: targetStatus,
        notes: notes || '',
        overtimeHours: Number(overtimeHours !== undefined ? overtimeHours : (req.body.overtime_hours || 0)),
        overtime_hours: Number(overtimeHours !== undefined ? overtimeHours : (req.body.overtime_hours || 0)),
        updatedAt: new Date().toISOString()
      };

      if (isFirebaseConnected() && firestore) {
        const attendanceCol = firestore.collection('attendance');
        const existingSnap = await attendanceCol
          .where('tenantId', '==', tenantId)
          .where('date', '==', targetDate)
          .where('employeeId', '==', targetEmployeeId)
          .get();

        if (!existingSnap.empty) {
          const docId = existingSnap.docs[0].id;
          await attendanceCol.doc(docId).set(attendanceData, { merge: true });
          return res.json({ id: docId, ...attendanceData });
        } else {
          const docRef = attendanceCol.doc();
          const newDoc = {
            id: docRef.id,
            createdAt: new Date().toISOString(),
            ...attendanceData
          };
          await docRef.set(newDoc);
          return res.status(201).json(newDoc);
        }
      } else {
        const db = getLocalDatabase();
        if (!db.attendance) db.attendance = [];

        const existingIdx = db.attendance.findIndex((a: any) => 
          a.tenantId === tenantId && 
          a.date === targetDate && 
          String(a.employeeId || a.employee_id) === String(targetEmployeeId)
        );

        if (existingIdx > -1) {
          db.attendance[existingIdx] = {
            ...db.attendance[existingIdx],
            ...attendanceData
          };
          saveLocalDatabase(db);
          return res.json(db.attendance[existingIdx]);
        } else {
          const newAttendance = {
            id: `att-${Date.now()}`,
            createdAt: new Date().toISOString(),
            ...attendanceData
          };
          db.attendance.push(newAttendance);
          saveLocalDatabase(db);
          return res.status(201).json(newAttendance);
        }
      }
    }
  } catch (error: any) {
    console.error('Error saving attendance:', error);
    return res.status(500).json({ error: 'فشل حفظ سجلات الحضور' });
  }
});

// GET /api/settings
router.get('/settings', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  if (!db.settings_by_tenant) db.settings_by_tenant = {};
  res.json(db.settings_by_tenant[tenantId] || db.settings || { default_language: 'ar', visible_sections: {} });
});

// POST /api/settings/visible-sections
router.post('/settings/visible-sections', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { visible_sections } = req.body;
  const db = getLocalDatabase();
  if (!db.settings_by_tenant) db.settings_by_tenant = {};
  if (!db.settings_by_tenant[tenantId]) db.settings_by_tenant[tenantId] = db.settings || { default_language: 'ar', visible_sections: {} };
  db.settings_by_tenant[tenantId].visible_sections = visible_sections;
  saveLocalDatabase(db);
  res.json({ success: true, settings: db.settings_by_tenant[tenantId] });
});

// GET /api/company-settings
router.get('/company-settings', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  if (!db.company_settings_by_tenant) db.company_settings_by_tenant = {};
  res.json(db.company_settings_by_tenant[tenantId] || db.company_settings || {});
});

// PUT /api/company-settings
router.put('/company-settings', authorize('admin', 'manager'), (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  if (!db.company_settings_by_tenant) db.company_settings_by_tenant = {};
  const current = db.company_settings_by_tenant[tenantId] || db.company_settings || {};
  db.company_settings_by_tenant[tenantId] = { ...current, ...req.body };
  saveLocalDatabase(db);
  res.json(db.company_settings_by_tenant[tenantId]);
});

// GET /api/company-settings/modules
router.get('/company-settings/modules', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  if (!db.company_modules_by_tenant) db.company_modules_by_tenant = {};
  res.json(db.company_modules_by_tenant[tenantId] || db.company_modules || {
    crm: true,
    scrap: true,
    shipping: true,
    hr: true,
    accounting: true,
    inventory: true
  });
});

// PUT /api/company-settings/modules
router.put('/company-settings/modules', authorize('admin'), (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  if (!db.company_modules_by_tenant) db.company_modules_by_tenant = {};
  const current = db.company_modules_by_tenant[tenantId] || db.company_modules || {
    crm: true,
    scrap: true,
    shipping: true,
    hr: true,
    accounting: true,
    inventory: true
  };
  db.company_modules_by_tenant[tenantId] = { ...current, ...req.body };
  saveLocalDatabase(db);
  res.json(db.company_modules_by_tenant[tenantId]);
});

// GET /api/company-modules
router.get('/company-modules', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  if (!db.company_modules_by_tenant) db.company_modules_by_tenant = {};
  res.json(db.company_modules_by_tenant[tenantId] || db.company_modules || {
    crm: true,
    scrap: true,
    shipping: true,
    hr: true,
    accounting: true,
    inventory: true
  });
});

// PUT /api/company-settings/activity
router.put('/company-settings/activity', authorize('admin', 'manager'), (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { activity_code } = req.body;
  if (!activity_code) return res.status(400).json({ error: "كود النشاط حقل إلزامي" });

  const db = getLocalDatabase();
  if (!db.company_settings_by_tenant) db.company_settings_by_tenant = {};
  const current = db.company_settings_by_tenant[tenantId] || db.company_settings || {};
  db.company_settings_by_tenant[tenantId] = { ...current, activity_code };
  saveLocalDatabase(db);
  res.json({ success: true, activity_code, settings: db.company_settings_by_tenant[tenantId] });
});

// GET /api/activity-types
router.get('/activity-types', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();

  const builtInActivities: Array<{ code: string; name: string; icon: string; description: string; is_custom?: boolean }> = [
    { code: 'retail', name: 'تجزئة ومبيعات مباشرة', icon: '🛒', description: 'مبيعات التجزئة وفواتير نقاط البيع والعملاء', is_custom: false },
    { code: 'scrap', name: 'الخردة وإعادة التدوير', icon: '🧹', description: 'إدارة مخزون الخردة والسكراب والمصانع', is_custom: false },
    { code: 'construction', name: 'مقاولات وتطوير عقاري', icon: '🏗️', description: 'المستخلصات والمستودعات والمشاريع والعمالة', is_custom: false },
    { code: 'transport', name: 'نقل وشحن', icon: '🚛', description: 'إدارة الأسطول والشحنات وبولصات الشحن', is_custom: false },
    { code: 'manufacturing', name: 'تصنيع', icon: '🏭', description: 'أوامر الإنتاج والمواد الخام والتصنيع', is_custom: false },
    { code: 'logistics', name: 'خدمات لوجستية', icon: '📦', description: 'التخزين والتوزيع وتقارير المخزون', is_custom: false },
    { code: 'import_export', name: 'استيراد وتصدير', icon: '🌍', description: 'الشحن الدولي والاعتمادات والجمارك', is_custom: false },
    { code: 'it_services', name: 'تكنولوجيا معلومات', icon: '💻', description: 'تطوير البرمجيات والبنية التحتية والاشتراكات', is_custom: false },
    { code: 'agriculture', name: 'زراعة وثروة حيوانية', icon: '🌾', description: 'المحاصيل والثروة الحيوانية والتخزين الزراعي', is_custom: false },
    { code: 'maintenance', name: 'صيانة وتشغيل', icon: '🔧', description: 'عقود الصيانة وقطع الغيار وفرق الفنيين', is_custom: false },
    { code: 'hospitality', name: 'ضيافة وسياحة', icon: '🏨', description: 'إدارة الفنادق والحجوزات والنزلاء', is_custom: false },
    { code: 'education', name: 'تعليم وتدريب', icon: '🎓', description: 'إدارة الطلاب والرسوم الكادر التعليمي', is_custom: false },
    { code: 'consulting', name: 'استشارات إدارية ومالية', icon: '📋', description: 'الدراسات والمشروعات والدعم الاستشاري', is_custom: false }
  ];

  const customActivities = (db.activity_types || []).filter((at: any) => at.tenantId === tenantId);
  
  // Merge built-in with custom activities
  const allActivities = [...builtInActivities];
  customActivities.forEach((ca: any) => {
    if (!allActivities.some(a => a.code === ca.code)) {
      allActivities.push({
        code: ca.code || `custom_${ca.id}`,
        name: ca.name,
        icon: ca.icon || '💼',
        description: ca.description || 'نشاط تجاري مسجل مخصص',
        is_custom: true
      });
    }
  });

  res.json(allActivities);
});

// POST /api/activity-types
router.post('/activity-types', authorize('admin', 'manager'), (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { name, icon, code, description } = req.body;
  if (!name) return res.status(400).json({ error: "اسم النشاط حقل إلزامي" });

  const actCode = code ? code.trim().toLowerCase().replace(/\s+/g, '_') : `act_${Date.now()}`;
  const db = getLocalDatabase();
  if (!db.activity_types) db.activity_types = [];

  const newType = {
    id: `act-${Date.now()}`,
    tenantId,
    code: actCode,
    name,
    icon: icon || '💼',
    description: description || 'نشاط تجاري جديد مسجل',
    is_custom: true,
    created_at: new Date().toISOString()
  };

  db.activity_types.push(newType);
  saveLocalDatabase(db);
  res.status(201).json(newType);
});

// GET /api/custom-fields
router.get('/custom-fields', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  res.json((db.custom_fields || []).filter((cf: any) => cf.tenantId === tenantId));
});

// POST /api/custom-fields
router.post('/custom-fields', authorize('admin', 'manager'), (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { name, type, entity_type } = req.body;
  if (!name || !type || !entity_type) {
    return res.status(400).json({ error: "الاسم، النوع، والكيان حقول إلزامية" });
  }
  const db = getLocalDatabase();
  if (!db.custom_fields) db.custom_fields = [];
  const newField = { id: `cf-${Date.now()}`, tenantId, name, type, entity_type };
  db.custom_fields.push(newField);
  saveLocalDatabase(db);
  res.status(201).json(newField);
});

// DELETE /api/custom-fields/:id
router.delete('/custom-fields/:id', authorize('admin', 'manager'), (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  const db = getLocalDatabase();
  if (!db.custom_fields) db.custom_fields = [];
  const idx = db.custom_fields.findIndex((cf: any) => cf.id === id && cf.tenantId === tenantId);
  if (idx === -1) return res.status(404).json({ error: "الحقل غير موجود أو لا تملك الصلاحية لحذفه" });

  db.custom_fields.splice(idx, 1);
  saveLocalDatabase(db);
  res.json({ success: true });
});

// CRM / Miscellaneous endpoints for HRView
router.get('/performance-reviews', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  res.json((db.performance_reviews || []).filter((r: any) => r.tenantId === tenantId));
});

router.get('/trainings', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  res.json((db.trainings || []).filter((t: any) => t.tenantId === tenantId));
});

router.get('/training-enrollments', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  res.json((db.training_enrollments || []).filter((t: any) => t.tenantId === tenantId));
});

router.get('/job-openings', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  res.json((db.job_openings || []).filter((j: any) => j.tenantId === tenantId));
});

router.get('/job-applications', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  res.json((db.job_applications || []).filter((j: any) => j.tenantId === tenantId));
});

router.get('/interviews', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  res.json((db.interviews || []).filter((i: any) => i.tenantId === tenantId));
});

// CRM / Miscellaneous installments for HRView
router.get('/installments', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  const list = (db.employee_installments || []).filter((i: any) => i.tenantId === tenantId);
  
  // Enrich with employee name and type details
  const enriched = list.map((inst: any) => {
    const employee = (db.employees || []).find((e: any) => String(e.id) === String(inst.employee_id));
    const type = (db.installment_types || []).find((t: any) => String(t.id) === String(inst.installment_type_id));
    
    const paid_amount = inst.paid_amount ?? 0;
    const total_amount = inst.total_amount ?? 0;
    const remaining_amount = Math.max(0, total_amount - paid_amount);
    const progress = total_amount > 0 ? Math.min(100, Math.round((paid_amount / total_amount) * 100)) : 0;
    
    let status = inst.status || 'active';
    if (remaining_amount <= 0) {
      status = 'completed';
    }
    
    let status_text = '🟢 نشط';
    if (status === 'completed') status_text = '✅ مكتمل';
    else if (status === 'defaulted') status_text = '🔴 متعثر';
    else if (status === 'cancelled') status_text = '⏸️ ملغي';

    return {
      ...inst,
      employee_name: employee ? employee.name : 'موظف غير معروف',
      installment_type_name: type ? type.name : 'سلفة/قسط عام',
      installment_type_icon: type ? type.icon : '💰',
      paid_amount,
      remaining_amount,
      progress,
      status,
      status_text
    };
  });
  
  res.json(enriched);
});

router.post('/installments', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  const { employee_id, installment_type_id, total_amount, total_months, start_date, interest_rate, notes, contract_number } = req.body;
  
  if (!employee_id || !installment_type_id || !total_amount || !total_months || !start_date) {
    return res.status(400).json({ error: "يرجى ملء الحقول المطلوبة" });
  }

  // Find employee and type
  const employee = (db.employees || []).find((e: any) => String(e.id) === String(employee_id));
  if (!employee) {
    return res.status(400).json({ error: "الموظف المحدد غير موجود" });
  }

  // Monthly installment calculation
  const principal = Number(total_amount);
  const months = Number(total_months);
  const rate = Number(interest_rate || 0);
  const total_to_pay = principal * (1 + (rate / 100));
  const monthly_amount = Math.round(total_to_pay / months);

  const newInstallment = {
    id: `inst-${Date.now()}`,
    tenantId,
    employee_id,
    installment_type_id,
    total_amount: total_to_pay,
    total_months: months,
    start_date,
    interest_rate: rate,
    notes,
    contract_number,
    monthly_amount,
    paid_amount: 0,
    remaining_amount: total_to_pay,
    status: 'active',
    created_at: new Date().toISOString()
  };

  if (!db.employee_installments) db.employee_installments = [];
  db.employee_installments.push(newInstallment);
  saveLocalDatabase(db);

  res.json({ success: true, installment: newInstallment });
});

router.post('/installments/pay', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  const { installment_id, payment_date, amount, payment_method, notes } = req.body;

  if (!installment_id || !payment_date || !payment_method) {
    return res.status(400).json({ error: "يرجى ملء جميع الحقول الإلزامية" });
  }

  const installment = (db.employee_installments || []).find((i: any) => String(i.id) === String(installment_id) && i.tenantId === tenantId);
  if (!installment) {
    return res.status(404).json({ error: "القسط غير موجود" });
  }

  const payAmount = amount ? Number(amount) : installment.monthly_amount;

  const newPayment = {
    id: `pay-${Date.now()}`,
    tenantId,
    installment_id,
    payment_date,
    amount: payAmount,
    payment_method,
    notes,
    created_at: new Date().toISOString()
  };

  if (!db.installment_payments) db.installment_payments = [];
  db.installment_payments.push(newPayment);

  // Update installment paid/remaining amounts
  installment.paid_amount = (installment.paid_amount || 0) + payAmount;
  installment.remaining_amount = Math.max(0, installment.total_amount - installment.paid_amount);
  
  if (installment.remaining_amount <= 0) {
    installment.status = 'completed';
  }

  saveLocalDatabase(db);

  res.json({ success: true, payment: newPayment });
});

router.get('/installments/:id/payments', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  const { id } = req.params;

  const payments = (db.installment_payments || []).filter((p: any) => String(p.installment_id) === String(id) && p.tenantId === tenantId);
  res.json(payments);
});

router.get('/installment-types', (req, res) => {
  const db = getLocalDatabase();
  res.json(db.installment_types || []);
});

router.post('/installment-types', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  const { name, icon, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: "يرجى إدخال اسم نوع التقسيط" });
  }

  const newType = {
    id: `itype-${Date.now()}`,
    tenantId,
    name,
    icon: icon || '💰',
    description: description || '',
    created_at: new Date().toISOString()
  };

  if (!db.installment_types) {
    db.installment_types = [
      { id: '1', name: 'سلفة نقدية عاجلة', icon: '💵', description: 'سلفة مالية مستقطعة من الراتب بدون فوائد' },
      { id: '2', name: 'قرض شخصي / تمويل', icon: '🏦', description: 'تمويل شخصي مع نسبة فائدة سنوية' },
      { id: '3', name: 'تقسيط أجهزة ومعدات', icon: '💻', description: 'شراء أجهزة ومعدات بالتقسيط' },
      { id: '4', name: 'قسط سيارة / مركبة', icon: '🚗', description: 'تمويل سيارات الشركة أو الموظفين' }
    ];
  }

  db.installment_types.push(newType);
  saveLocalDatabase(db);

  res.json({ success: true, installment_type: newType });
});

router.get('/installments/statistics', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  const list = (db.employee_installments || []).filter((i: any) => i.tenantId === tenantId);
  
  const total_amount = list.reduce((sum: number, inst: any) => sum + (inst.total_amount || 0), 0);
  const total_paid = list.reduce((sum: number, inst: any) => sum + (inst.paid_amount || 0), 0);
  const total_pending = Math.max(0, total_amount - total_paid);
  
  const active_installments = list.filter((i: any) => i.status === 'active').length;
  const completed_installments = list.filter((i: any) => i.status === 'completed').length;
  const total_overdue = list.filter((i: any) => i.status === 'defaulted').reduce((sum: number, inst: any) => sum + (inst.monthly_amount || 0), 0);
  
  const collection_rate = total_amount > 0 ? Math.round((total_paid / total_amount) * 100) : 0;

  res.json({
    total_amount,
    total_paid,
    total_pending,
    active_installments,
    completed_installments,
    total_overdue,
    collection_rate,
    total_installments: list.length,
    // Supporting the camelCase keys too just in case
    totalAmount: total_amount,
    paidAmount: total_paid,
    remainingAmount: total_pending,
    count: list.length
  });
});

// AI Chat endpoint
function getSystemContext(db: any): string {
  const employees = db.employees || [];
  const payroll = db.payroll || [];
  const invoices = db.invoices || [];
  const products = db.products || [];
  
  const totalEmployees = employees.length;
  const totalPayroll = payroll.reduce((sum: any, p: any) => sum + (p.netSalary || 0), 0);
  const totalRevenue = invoices.reduce((sum: any, inv: any) => sum + (inv.totalAmount || 0), 0);
  const totalProducts = products.length;
  const lowStock = products.filter((p: any) => (p.stockQuantity || 0) <= (p.reorderPoint || 0)).length;

  return `
    أنت مساعد ذكي لنظام الهضبة ERP.
    إليك بيانات الشركة الحالية:
    
    👥 عدد الموظفين: ${totalEmployees}
    💰 إجمالي الرواتب: ${totalPayroll.toLocaleString()} ج.م
    📄 إجمالي الفواتير: ${invoices.length}
    💵 إجمالي الإيرادات: ${totalRevenue.toLocaleString()} ج.م
    📦 عدد المنتجات: ${totalProducts}
    ⚠️ منتجات منخفضة المخزون: ${lowStock}
    
    يمكنك الإجابة عن أسئلة المستخدمين حول:
    - الموظفين (الأسماء، الأقسام، الرواتب)
    - الرواتب (الشهرية، الإجمالية، التفاصيل)
    - الفواتير (الحالة، القيم، العملاء)
    - المخزون (المنتجات، الكميات، التصنيفات)
    - التقارير (ملخصات عامة)
    
    أجب باللغة العربية بشكل واضح ومفيد.
    استخدم الأرقام الدقيقة من البيانات المقدمة.
  `;
}

async function processCommand(message: string, db: any, tenantId: string): Promise<any> {
  const lowerMessage = message.toLowerCase();

  // Add employee via voice command
  if (lowerMessage.includes('اضف موظف') || lowerMessage.includes('إضافة موظف')) {
    const nameMatch = message.match(/اسمه\s*([^\d]+)/);
    const salaryMatch = message.match(/راتب\s*(\d+)/);
    
    if (nameMatch && salaryMatch) {
      const name = nameMatch[1].trim();
      const salary = parseInt(salaryMatch[1]);
      
      const newEmployee = {
        id: `emp-${Date.now()}`,
        tenantId,
        name,
        basicSalary: salary,
        position: 'موظف',
        department: 'غير محدد',
        isActive: true,
        createdAt: new Date().toISOString()
      };
      
      if (!db.employees) db.employees = [];
      db.employees.push(newEmployee);
      saveLocalDatabase(db);
      
      return {
        action: 'add_employee',
        success: true,
        message: `✅ تم إضافة الموظف ${name} براتب ${salary} ج.م`,
        data: newEmployee
      };
    }
  }

  // List employees
  if (lowerMessage.includes('الموظفين') || lowerMessage.includes('موظفين')) {
    const employees = (db.employees || []).filter((e: any) => e.tenantId === tenantId);
    return {
      action: 'list_employees',
      success: true,
      data: employees,
      summary: `👥 عدد الموظفين: ${employees.length}`
    };
  }

  // List payroll
  if (lowerMessage.includes('الرواتب') || lowerMessage.includes('مرتبات')) {
    const payroll = (db.payroll || []).filter((p: any) => p.tenantId === tenantId);
    const total = payroll.reduce((sum: any, p: any) => sum + (p.netSalary || 0), 0);
    return {
      action: 'list_payroll',
      success: true,
      data: payroll,
      summary: `💰 إجمالي الرواتب: ${total.toLocaleString()} ج.م`
    };
  }

  return { action: 'unknown' };
}

// ============================================================
// 1.3 مسارات إدارة فواتير الموردين والمدفوعات (Accounts Payable & Supplier Invoices)
// ============================================================

// GET /api/inventory/purchase-orders
router.get('/inventory/purchase-orders', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const db = getLocalDatabase();
  
  if (!db.purchase_orders) {
    db.purchase_orders = [
      {
        id: "po-1",
        po_number: "PO-8291",
        vendor_id: "con-v-1",
        vendor_name: "الشركة المصرية للتوريدات العمومية",
        total: 12500,
        status: "received",
        created_at: new Date(Date.now() - 5*24*60*60*1000).toISOString(),
        tenantId: tenantId
      },
      {
        id: "po-2",
        po_number: "PO-4431",
        vendor_id: "con-v-2",
        vendor_name: "مجموعة الفهد للتجارة والمقاولات",
        total: 24000,
        status: "draft",
        created_at: new Date(Date.now() - 2*24*60*60*1000).toISOString(),
        tenantId: tenantId
      }
    ];
    saveLocalDatabase(db);
  }
  
  res.json((db.purchase_orders || []).filter((po: any) => po.tenantId === tenantId));
});

// GET /api/matching-rules
router.get('/matching-rules', (req, res) => {
  const db = getLocalDatabase();
  if (!db.matching_rules) {
    db.matching_rules = [
      {
        id: 1,
        name: "قاعدة مطابقة ثلاثية الأبعاد (3-Way Matching)",
        description: "مطابقة بيانات الفاتورة بالكامل مع تفاصيل أمر الشراء الأصلي وسند استلام البضائع الفعلي في المخازن لمنع الاحتيال والتسريب المالي.",
        rule_type: "three_way",
        priority: 1,
        is_active: true
      },
      {
        id: 2,
        name: "قاعدة مطابقة ثنائية (2-Way Matching)",
        description: "مطابقة الفاتورة مباشرة مع أمر الشراء الصادر (الأسعار والكميات المتعاقد عليها) للمصروفات والخدمات الإدارية.",
        rule_type: "two_way",
        priority: 2,
        is_active: true
      },
      {
        id: 3,
        name: "نسبة التفاوت المسموحة (Tolerance Limit 5%)",
        description: "تجاوز فروقات الأسعار الطفيفة وتمرير الفواتير آلياً إذا لم يتعدى فرق القيمة نسبة 5% مقارنة بأمر الشراء.",
        rule_type: "tolerance",
        priority: 3,
        is_active: true
      }
    ];
    saveLocalDatabase(db);
  }
  res.json(db.matching_rules);
});

// GET /api/supplier-invoices
router.get('/supplier-invoices', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { status } = req.query;
  const db = getLocalDatabase();

  if (!db.supplier_invoices) {
    db.supplier_invoices = [
      {
        id: 1,
        invoice_number: "SI-9821",
        supplier_id: "con-v-1",
        supplier_name: "الشركة المصرية للتوريدات العمومية",
        purchase_order_id: "po-1",
        invoice_date: new Date(Date.now() - 4*24*60*60*1000).toISOString().split('T')[0],
        due_date: new Date(Date.now() + 26*24*60*60*1000).toISOString().split('T')[0],
        subtotal: 11000,
        tax: 1500,
        total: 12500,
        status: "received",
        match_status: "matched",
        match_score: 100,
        mismatch_reason: "",
        approved_by_name: "",
        payment_date: null,
        payment_amount: null,
        payment_reference: null,
        notes: "تم استيراد الفاتورة ومطابقتها تلقائياً بنجاح مع أمر الشراء PO-8291.",
        created_at: new Date(Date.now() - 4*24*60*60*1000).toISOString(),
        tenantId: tenantId
      },
      {
        id: 2,
        invoice_number: "SI-1102",
        supplier_id: "con-v-2",
        supplier_name: "مجموعة الفهد للتجارة والمقاولات",
        purchase_order_id: "po-2",
        invoice_date: new Date(Date.now() - 1*24*60*60*1000).toISOString().split('T')[0],
        due_date: new Date(Date.now() + 29*24*60*60*1000).toISOString().split('T')[0],
        subtotal: 21500,
        tax: 2500,
        total: 24000,
        status: "pending_approval",
        match_status: "partial",
        match_score: 85,
        mismatch_reason: "اختلاف طفيف في كمية التوريد المستلمة مقارنة بأمر الشراء الفعلي بالمخزن",
        approved_by_name: "",
        payment_date: null,
        payment_amount: null,
        payment_reference: null,
        notes: "يرجى مراجعة فروقات الكميات المستلمة قبل الاعتماد النهائي للفاتورة والمطابقة.",
        created_at: new Date(Date.now() - 1*24*60*60*1000).toISOString(),
        tenantId: tenantId
      }
    ];
    saveLocalDatabase(db);
  }

  let list = (db.supplier_invoices || []).filter((i: any) => i.tenantId === tenantId);
  if (status) {
    list = list.filter((i: any) => i.status === status);
  }
  res.json(list);
});

// GET /api/supplier-invoices/:id/logs
router.get('/supplier-invoices/:id/logs', (req, res) => {
  const { id } = req.params;
  const db = getLocalDatabase();

  if (!db.supplier_invoice_logs) {
    db.supplier_invoice_logs = [
      {
        id: 1,
        invoice_id: 1,
        action: "الرفع والمطابقة",
        comment: "تم رفع الفاتورة ومطابقتها آلياً بنسبة 100% مع أمر الشراء PO-8291 وسندات المخزن.",
        user_name: "نظام الذكاء الاصطناعي",
        created_at: new Date(Date.now() - 4*24*60*60*1000).toISOString()
      },
      {
        id: 2,
        invoice_id: 2,
        action: "الرفع والمطابقة الجزئية",
        comment: "تم رفع الفاتورة وتحديد مطابقة جزئية بنسبة 85% مع تنبيه فرق كميات في سند الاستلام.",
        user_name: "نظام الذكاء الاصطناعي",
        created_at: new Date(Date.now() - 1*24*60*60*1000).toISOString()
      }
    ];
    saveLocalDatabase(db);
  }

  const logs = (db.supplier_invoice_logs || []).filter((l: any) => String(l.invoice_id) === String(id));
  res.json(logs);
});

// POST /api/supplier-invoices
router.post('/supplier-invoices', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const {
    invoice_number,
    supplier_id,
    purchase_order_id,
    invoice_date,
    due_date,
    subtotal,
    tax,
    notes
  } = req.body;

  const db = getLocalDatabase();
  if (!db.supplier_invoices) db.supplier_invoices = [];
  if (!db.supplier_invoice_logs) db.supplier_invoice_logs = [];

  // Find supplier name
  const supplier = (db.contacts || []).find((c: any) => c.id === supplier_id);
  const supplier_name = supplier ? supplier.name : "مورد خارجي";

  const subTotalNum = Number(subtotal) || 0;
  const taxNum = Number(tax) || 0;
  const totalNum = subTotalNum + taxNum;

  const invoiceId = db.supplier_invoices.length + 1;

  const newInvoice = {
    id: invoiceId,
    invoice_number: invoice_number || `SI-${Math.floor(1000 + Math.random() * 9000)}`,
    supplier_id,
    supplier_name,
    purchase_order_id: purchase_order_id ? purchase_order_id : null,
    invoice_date: invoice_date || new Date().toISOString().split('T')[0],
    due_date: due_date || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    subtotal: subTotalNum,
    tax: taxNum,
    total: totalNum,
    status: "received",
    match_status: purchase_order_id ? "matched" : "pending",
    match_score: purchase_order_id ? 100 : 0,
    mismatch_reason: "",
    approved_by_name: "",
    payment_date: null,
    payment_amount: null,
    payment_reference: null,
    notes: notes || "",
    created_at: new Date().toISOString(),
    tenantId: tenantId
  };

  db.supplier_invoices.push(newInvoice);

  // Add Log Entry
  const newLog = {
    id: db.supplier_invoice_logs.length + 1,
    invoice_id: invoiceId,
    action: "إنشاء الفاتورة",
    comment: purchase_order_id 
      ? `تم تسجيل الفاتورة بنجاح ومطابقتها تلقائياً مع أمر الشراء PO ${purchase_order_id}.`
      : "تم تسجيل الفاتورة كـ فاتورة مباشرة بدون أمر شراء مسبق بانتظار استكمال المطابقة والمراجعة.",
    user_name: "أحمد حماد",
    created_at: new Date().toISOString()
  };
  db.supplier_invoice_logs.push(newLog);

  saveLocalDatabase(db);
  res.status(201).json(newInvoice);
});

// PUT /api/supplier-invoices/:id/approve
router.put('/supplier-invoices/:id/approve', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  const { comment } = req.body;

  const db = getLocalDatabase();
  if (!db.supplier_invoices) db.supplier_invoices = [];
  if (!db.supplier_invoice_logs) db.supplier_invoice_logs = [];

  const idx = db.supplier_invoices.findIndex((i: any) => String(i.id) === String(id) && i.tenantId === tenantId);
  if (idx === -1) return res.status(404).json({ error: "الفاتورة غير موجودة أو لا تملك صلاحية لاعتمادها" });

  db.supplier_invoices[idx].status = "approved";
  db.supplier_invoices[idx].approved_by_name = "أحمد حماد";

  // Add Log Entry
  const newLog = {
    id: db.supplier_invoice_logs.length + 1,
    invoice_id: Number(id),
    action: "اعتماد الفاتورة",
    comment: comment || "تم مراجعة واعتماد المستند آلياً من قبل الإدارة المالية.",
    user_name: "أحمد حماد",
    created_at: new Date().toISOString()
  };
  db.supplier_invoice_logs.push(newLog);

  saveLocalDatabase(db);
  res.json({ success: true, invoice: db.supplier_invoices[idx] });
});

// POST /api/supplier-invoices/:id/pay
router.post('/supplier-invoices/:id/pay', (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { id } = req.params;
  const { payment_date, payment_reference } = req.body;

  const db = getLocalDatabase();
  if (!db.supplier_invoices) db.supplier_invoices = [];
  if (!db.supplier_invoice_logs) db.supplier_invoice_logs = [];

  const idx = db.supplier_invoices.findIndex((i: any) => String(i.id) === String(id) && i.tenantId === tenantId);
  if (idx === -1) return res.status(404).json({ error: "الفاتورة غير موجودة أو لا تملك صلاحية لسدادها" });

  const invoice = db.supplier_invoices[idx];
  invoice.status = "paid";
  invoice.payment_date = payment_date || new Date().toISOString().split('T')[0];
  invoice.payment_amount = invoice.total;
  invoice.payment_reference = payment_reference || `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

  // Deduct from bank account cash (Bank Account Code '1010')
  if (!db.accounts) db.accounts = [];
  const bankIdx = db.accounts.findIndex((a: any) => a.code === "1010" && a.tenantId === tenantId);
  if (bankIdx !== -1) {
    db.accounts[bankIdx].balance = Math.max(0, Number(db.accounts[bankIdx].balance || 0) - invoice.total);
  }

  // Create audit/bank transaction entry
  if (!db.bank_transactions) db.bank_transactions = [];
  const bankTransaction = {
    id: `txn-${Date.now()}`,
    tenantId: tenantId,
    bankAccountId: "Al-Rajhi Bank Main",
    date: invoice.payment_date,
    amount: -invoice.total, // negative for payment
    description: `سداد فاتورة المورد رقم ${invoice.invoice_number} لـ "${invoice.supplier_name}"`,
    category: "expenses",
    isReconciled: true,
    createdAt: new Date().toISOString()
  };
  db.bank_transactions.push(bankTransaction);

  // Add Log Entry
  const newLog = {
    id: db.supplier_invoice_logs.length + 1,
    invoice_id: Number(id),
    action: "سداد الفاتورة",
    comment: `تم ترحيل السداد البنكي بنجاح بمرجع الحوالة: ${invoice.payment_reference}. تم خصم ${invoice.total} ج.م من حساب المصرف الأهلي.`,
    user_name: "أحمد حماد",
    created_at: new Date().toISOString()
  };
  db.supplier_invoice_logs.push(newLog);

  saveLocalDatabase(db);
  res.json({ success: true, invoice: db.supplier_invoices[idx] });
});

router.post('/ai/chat', async (req, res) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { messages, message } = req.body;
  const db = getLocalDatabase();

  // Filter db data for this tenant specifically for the Copilot view
  const tenantDb = {
    ...db,
    tenants: (db.tenants || []).filter((t: any) => t.id === tenantId),
    users: (db.users || []).filter((u: any) => u.tenantId === tenantId),
    accounts: (db.accounts || []).filter((a: any) => a.tenantId === tenantId),
    contacts: (db.contacts || []).filter((c: any) => c.tenantId === tenantId),
    invoices: (db.invoices || []).filter((i: any) => i.tenantId === tenantId),
    expenses: (db.expenses || []).filter((e: any) => e.tenantId === tenantId),
    products: (db.products || []).filter((p: any) => p.tenantId === tenantId),
    employees: (db.employees || []).filter((e: any) => e.tenantId === tenantId),
    payroll: (db.payroll || []).filter((p: any) => p.tenantId === tenantId),
    leaves: (db.leaves || []).filter((l: any) => l.tenantId === tenantId),
    attendance: (db.attendance || []).filter((a: any) => a.tenantId === tenantId),
  };

  const currentTenant = tenantDb.tenants?.[0] || { id: tenantId, name: "شركة الهضبة للحلول التقنية", plan: "pro" };

  if (messages && Array.isArray(messages)) {
    const summary = {
      tenantName: currentTenant.name || "شركة الهضبة للحلول التقنية",
      plan: currentTenant.plan || "pro",
      totalCashInBank: tenantDb.accounts?.find((a: any) => a.code === "1010")?.balance || 0,
      accountsReceivable: tenantDb.accounts?.find((a: any) => a.code === "1200")?.balance || 0,
      accountsPayable: tenantDb.accounts?.find((a: any) => a.code === "2010")?.balance || 0,
      totalProducts: (tenantDb.products || []).length,
      lowStockItemsCount: (tenantDb.products || []).filter((p: any) => p.stockQuantity <= p.reorderPoint).length,
      unpaidInvoicesSum: (tenantDb.invoices || []).filter((i: any) => i.status !== "paid").reduce((sum: any, i: any) => sum + ((i.totalAmount || 0) - (i.paidAmount || 0)), 0),
      contactsCount: (tenantDb.contacts || []).length
    };

    const systemInstruction = `أنت "كوبايلوت بروميت المحاسبي" (Promet Accountancy Copilot)، مساعد مالي ومستشار زكوي ومحاسبي عبقري مدمج في نظام بروميت المحاسبي الذي يشبه QuickBooks و NetSuite.
مهمتك الرد بمهنية، وضوح، وأسلوب ودود ومبسط باللغة العربية لمساعدة رواد الأعمال والمحاسبين.
تتكلم بثقة ومعرفة تامة بالمعايير الشائعة في جمهورية مصر العربية والخليج.

إليك الملخص المالي اللحظي والفعلي للشركة التي تخدمها حالياً (${summary.tenantName}) من واقع قواعد بياناتنا:
- اسم الكيان: ${summary.tenantName}
- الباقة المشترك بها: باقة ${summary.plan === "pro" ? "المحترفين Pro" : summary.plan === "enterprise" ? "المؤسسات الكبرى Enterprise" : "الأساسية Basic"}
- السيولة الحالية المتوفرة في حساب البنك الأهلي المصري الجاري: ${summary.totalCashInBank.toLocaleString()} جنيه مصري.
- حساب المبالغ المستحقة من العملاء (الأرصدة المدينة المدورة): ${summary.accountsReceivable.toLocaleString()} جنيه مصري.
- إجمالي مبلغ الفواتير غير المسددة حالياً: ${summary.unpaidInvoicesSum.toLocaleString()} جنيه مصري.
- عدد المنتجات في مستودع المخزون: ${summary.totalProducts} منتجات.
- المنتجات التي انخفض مخزونها وتحتاج إلى إعادة طلب عاجل: ${summary.lowStockItemsCount} منتجات.
- عدد جهات الاتصال (مسجلي العملاء والموردين بدفتر العناوين): ${summary.contactsCount} جهات.

الرجاء استخدام هذه الأرقام الدقيقة لمخاطبة العميل وإجابته إذا سأل عن أرصدة، نفقات، جرد، أو تقرير مالي. لا تذكر للعميل أنك تقرأ من ملف JSON أو مصفوفة، بل قل: "بناءً على السجلات المالية في بروميت اليوم..."
دائماً اجعل الأجوبة مشجعة ومحترفة ومقتضبة.`;

    const ai = getAi();
    if (!ai) {
      const lastMessage = messages[messages.length - 1]?.text || "";
      let reply = "مرحباً بك! أنا مساعد بروميت المحاسبي. للأسف، لم يتم تهيئة مفتاح الذكاء الاصطناعي بشكل كامل لتفعيل المحادثة الحوارية الديناميكية، ولكن يمكنني تزويدك بتقرير رقمي لحظي من سجلاتنا المحاسبية:";
      
      if (lastMessage.includes("رصيد") || lastMessage.includes("البنك") || lastMessage.includes("فلوس") || lastMessage.includes("كاش")) {
        reply = `أهلاً بك. رصيدك المتوفر حالياً في **حساب البنك الأهلي المصري الجاري** هو **${summary.totalCashInBank.toLocaleString()} جنيه مصري**، بينما تبلغ حسابات الذمم المدينة من العملاء **${summary.accountsReceivable.toLocaleString()} جنيه مصري**.`;
      } else if (lastMessage.includes("مخزون") || lastMessage.includes("بضاعة") || lastMessage.includes("ناقص")) {
        reply = `لدينا حالياً **${summary.totalProducts}** منتجات مسجلة بقائمة جرد المخازن. هناك **${summary.lowStockItemsCount}** منتجات انخفضت دون حد إعادة الطلب وتتطلب اتخاذ إجراء شراء وتوريد لمنع انقطاع خدمة العملاء.`;
      } else if (lastMessage.includes("فاتورة") || lastMessage.includes("الفواتير") || lastMessage.includes("العملاء")) {
        reply = `حسب آخر العمليات المدققة، يبلغ إجمالي المبالغ المستحقة غير المروية من الفواتير المعلقة للعملاء **${summary.unpaidInvoicesSum.toLocaleString()} جنيه مصري**. نوصي بإصدار إشعارات التنبيه التلقائي المدمجة في بروميت.`;
      } else {
        reply = `أهلاً بك في نظام بروميت المحاسبي الذكي.
سجلاتك اليوم تشير إلى:
- سيولة نقدية: **${summary.totalCashInBank.toLocaleString()} جنيه**
- ذمم مدينة معلقة: **${summary.accountsReceivable.toLocaleString()} جنيه**
- مخزون منخفض التنبيه: **${summary.lowStockItemsCount} سلعة**
هل تود مني توليد نموذج قيد اليومية، أو المساعدة في حصر فواتير العملاء؟`;
      }

      return res.json({ text: reply, isSimulated: true });
    }

    try {
      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: messages.map((m: any) => m.text).join("\n"),
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      return res.json({ text: aiResponse.text });
    } catch (err: any) {
      console.error("Failed to generate Chat from Gemini:", err);
      return res.status(500).json({ error: "تعذر تشغيل المساعد المحاسبي الذكي في الوقت الحالي", details: err.message });
    }
  }

  if (message) {
    try {
      const systemContext = getSystemContext(tenantDb);
      let responseText = "";
      const ai = getAi();

      if (ai) {
        const aiResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `${systemContext}\n\nسؤال المستخدم: ${message}`,
          config: {
            temperature: 0.7
          }
        });
        responseText = aiResponse.text || "";
      } else {
        responseText = `أهلاً بك! أنا المساعد الذكي لنظام الهضبة ERP (تعمل محاكاة ذكية محلياً حالياً).
إليك البيانات الحالية من واقع سجلاتنا:
👥 عدد الموظفين: ${tenantDb.employees?.length || 0}
💰 إجمالي الرواتب: ${(tenantDb.payroll || []).reduce((sum: any, p: any) => sum + (p.netSalary || 0), 0).toLocaleString()} ج.م
📄 إجمالي الفواتير: ${tenantDb.invoices?.length || 0}
📦 عدد المنتجات: ${tenantDb.products?.length || 0}

لقد استلمت استفسارك: "${message}".`;
      }

      const commandResult = await processCommand(message, db, tenantId);
      return res.json({
        response: responseText,
        command: commandResult
      });
    } catch (error: any) {
      console.error("❌ فشل معالجة الرسالة في المساعد الذكي:", error);
      return res.status(500).json({ error: "فشل معالجة الطلب" });
    }
  }

  return res.status(400).json({ error: "الرجاء توفير مصفوفة المحادثة أو الرسالة بشكل سليم" });
});

// ============================================================
// Endpoint: إرسال عرض السعر عبر البريد كملف PDF مرفق حقيقي
// ============================================================
router.post('/quotations/send-email', async (req: Request, res: Response) => {
  try {
    const { quotation, email, recipientEmail } = req.body;
    const targetEmail = recipientEmail || email;

    if (!targetEmail) {
      return res.status(400).json({ success: false, error: 'بريد المستقبل مطلوب' });
    }

    if (!quotation) {
      return res.status(400).json({ success: false, error: 'بيانات عرض السعر مطلوبة' });
    }

    // 1. توليد ملف الـ PDF في السيرفر
    const pdfBuffer = await generateQuotationPdfBuffer(quotation);
    const quotationNo = quotation.quotationNumber || `QT-${Date.now()}`;
    const filename = `Quotation_${quotationNo}.pdf`;

    // 2. إعداد نص ورسالة البريد الإلكتروني
    const subject = `📄 عرض سعر رسمي رقم ${quotationNo} - ${quotation.clientName || ''}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; direction: rtl; border: 1px solid #e2e8f0; rounded: 12px;">
        <h2 style="color: #2563eb;">عرض سعر رسمي - ${quotation.companyName || 'مؤسسة المنصة الرقمية'}</h2>
        <p>السادة / <strong>${quotation.clientName || 'العميل المحترم'}</strong> المحترمين،</p>
        <p>تحية طيبة وبعد،،</p>
        <p>تجدون برفقه ملف PDF الرسمي الخاص بعرض السعر رقم <strong>${quotationNo}</strong> والمؤرخ في <strong>${quotation.date || ''}</strong>.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>صلاحية العرض حتى:</strong> ${quotation.expiryDate || '15 يوماً'}</p>
          <p style="margin: 5px 0;"><strong>إجمالي القيمة:</strong> ${quotation.total ? quotation.total.toFixed(2) : ''} ${quotation.currency || 'EGP'}</p>
        </div>
        <p style="color: #64748b; font-size: 13px;">تم توليد هذا البريد آلياً من نظام ERP ومرفق معه ملف PDF الرسمي.</p>
      </div>
    `;

    // 3. الإرسال عبر خدمة Nodemailer
    const mailResult = await sendEmail({
      to: targetEmail,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    if (mailResult.success) {
      return res.json({
        success: true,
        message: '✅ تم إرسال البريد الإلكتروني مع ملف الـ PDF المرفق بنجاح!',
        messageId: mailResult.messageId,
        previewUrl: mailResult.previewUrl
      });
    } else {
      return res.status(500).json({
        success: false,
        error: mailResult.error || 'فشل إرسال البريد عبر الخادم'
      });
    }
  } catch (err: any) {
    console.error('Error in /api/quotations/send-email:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/send-quotation-email', (req, res, next) => {
  req.url = '/quotations/send-email';
  (router as any).handle(req, res, next);
});

export default router;
