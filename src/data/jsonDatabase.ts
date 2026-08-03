import fs from 'fs';
import path from 'path';
import { AsyncLocalStorage } from 'async_hooks';
import bcrypt from 'bcryptjs';
import { logger } from '../config/logger';

// ============================================================
// 1. الثوابت والأنواع
// ============================================================

export const DB_FILE = path.join(process.cwd(), 'database.json');
export const tenantStorage = new AsyncLocalStorage<string>();

export interface DatabaseSchema {
  users: any[];
  employees: any[];
  products: any[];
  invoices: any[];
  payroll: any[];
  scrap: any[];
  shipping: any[];
  backups: any[];
  notifications: any[];
  tenants: any[];
  contacts: any[];
  purchases: any[];
  projects: any[];
  project_tasks: any[];
  project_team: any[];
  [key: string]: any[]; // للجداول الإضافية
}

// ============================================================
// 2. دوال التحميل والحفظ الأساسية
// ============================================================

export const getDbFile = (): string => {
  return DB_FILE;
};

export const loadDatabase = (): DatabaseSchema => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(raw);
      logger.info(`📂 Database loaded from JSON file: ${path.basename(DB_FILE)}`);
      return data;
    }

    // Check fallback shard file if database.json doesn't exist yet
    const shardFallback = path.join(process.cwd(), 'data', 'shards', 'database-tenant-promet-sa.json');
    if (fs.existsSync(shardFallback)) {
      const raw = fs.readFileSync(shardFallback, 'utf-8');
      const data = JSON.parse(raw);
      logger.info(`📂 Database recovered from shard fallback into: ${path.basename(DB_FILE)}`);
      saveDatabase(data);
      return data;
    }
  } catch (error) {
    logger.error(`❌ Failed to load database: ${path.basename(DB_FILE)}`, error);
  }
  
  // إذا لم يكن الملف موجوداً، استخدم البيانات الافتراضية
  logger.info(`🔄 No database file found, creating seeded data for: ${path.basename(DB_FILE)}`);
  const seedData = getInitialSeededData();
  saveDatabase(seedData);
  return seedData;
};

export const saveDatabase = (data: DatabaseSchema): void => {
  const currentDbFile = getDbFile();
  try {
    const dir = path.dirname(currentDbFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(currentDbFile, JSON.stringify(data, null, 2), 'utf-8');
    logger.debug(`💾 Database saved to JSON file: ${path.basename(currentDbFile)}`);
  } catch (error) {
    logger.error(`❌ Failed to save database: ${path.basename(currentDbFile)}`, error);
    throw error;
  }
};

// ============================================================
// 3. البيانات الافتراضية للتجربة (Seeding)
// ============================================================

export const getInitialSeededData = (): DatabaseSchema => {
  const now = new Date().toISOString();

  const seedPasswordPlain = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
  const seedPasswordHash = bcrypt.hashSync(seedPasswordPlain, 10);

  if (!process.env.DEFAULT_ADMIN_PASSWORD) {
    logger.warn('⚠️ DEFAULT_ADMIN_PASSWORD غير محدد في متغيرات البيئة — تم استخدام كلمة المرور الافتراضية "admin123" لحسابات التجربة. يُنصح بضبطها في بيئة الإنتاج.');
  }

  return {
    users: [
      {
        id: 'u-1',
        name: 'أحمد حماد',
        email: 'admin@promet.com',
        password: seedPasswordHash,
        role: 'admin',
        tenantId: 't-1',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'u-2',
        name: 'Manager User',
        email: 'manager@promet.com',
        password: seedPasswordHash,
        role: 'manager',
        tenantId: 't-1',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'u-3',
        name: 'Employee User',
        email: 'employee@promet.com',
        password: seedPasswordHash,
        role: 'employee',
        tenantId: 't-1',
        createdAt: now,
        updatedAt: now,
      },
    ],
    employees: [
      {
        id: 'emp-1',
        name: 'John Doe',
        email: 'john@company.com',
        phone: '+20123456789',
        position: 'Senior Accountant',
        department: 'Finance',
        basicSalary: 15000,
        tenantId: 't-1',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'emp-2',
        name: 'Jane Smith',
        email: 'jane@company.com',
        phone: '+20123456788',
        position: 'HR Manager',
        department: 'Human Resources',
        basicSalary: 12000,
        tenantId: 't-1',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    ],
    products: [
      {
        id: 'p-1',
        name: 'Laptop Pro',
        sku: 'LP-001',
        description: 'High performance laptop',
        unitPrice: 25000,
        stockQuantity: 50,
        minStock: 10,
        tenantId: 't-1',
        category: 'Electronics',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'p-2',
        name: 'Office Desk',
        sku: 'OD-001',
        description: 'Wooden office desk',
        unitPrice: 5000,
        stockQuantity: 20,
        minStock: 5,
        tenantId: 't-1',
        category: 'Furniture',
        createdAt: now,
        updatedAt: now,
      },
    ],
    invoices: [],
    payroll: [],
    scrap: [],
    shipping: [],
    backups: [],
    notifications: [],
    tenants: [
      {
        id: 't-1',
        name: 'شركة الهضبة للحلول التقنية',
        email: 'info@promet.com',
        phone: '+20123456789',
        address: 'Cairo, Egypt',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    contacts: [],
    purchases: [],
    projects: [
      {
        id: 1,
        name: 'مشروع برج النخيل السكني',
        code: 'PRJ-001',
        description: 'إنشاء برج سكني يتكون من 12 طابقاً مع مواقف سيارات',
        client_id: 'c-1',
        client_name: 'شركة الاستثمار العقاري',
        project_manager_id: 'u-1',
        project_manager_name: 'أحمد حماد',
        start_date: '2026-01-10',
        end_date: '2026-12-31',
        budget: 5500000,
        priority: 'high',
        status: 'in_progress',
        progress: 35,
        tenantId: 'tenant-promet-sa',
        createdAt: now
      },
      {
        id: 2,
        name: 'تطوير البنية التحتية لشبكة المياه',
        code: 'PRJ-002',
        description: 'توريد وتركيب خطوط مياه رئيسية بالمنطقة الصناعية',
        client_id: 'c-2',
        client_name: 'الهيئة العامة للمياه',
        project_manager_id: 'u-1',
        project_manager_name: 'أحمد حماد',
        start_date: '2026-02-01',
        end_date: '2026-08-30',
        budget: 2800000,
        priority: 'medium',
        status: 'in_progress',
        progress: 60,
        tenantId: 'tenant-promet-sa',
        createdAt: now
      }
    ],
    project_tasks: [
      {
        id: 101,
        project_id: 1,
        title: 'أعمال الأساسات والخرسانة المسلحة',
        description: 'صب قواعد البرج والأعمدة الأرضية',
        assigned_to: 'أحمد حماد',
        status: 'completed',
        priority: 'high',
        start_date: '2026-01-10',
        due_date: '2026-03-30',
        estimated_hours: 320,
        tenantId: 'tenant-promet-sa'
      },
      {
        id: 102,
        project_id: 1,
        title: 'تشطيبات الهيكل الخرساني للطوابق 1-6',
        description: 'بناء الجدران والقصارة والخدمات',
        assigned_to: 'محمد علي',
        status: 'in_progress',
        priority: 'medium',
        start_date: '2026-04-01',
        due_date: '2026-07-15',
        estimated_hours: 500,
        tenantId: 'tenant-promet-sa'
      }
    ],
    project_team: [
      {
        id: 1,
        project_id: 1,
        employee_id: 'emp-1',
        employee_name: 'أحمد حماد',
        role: 'مدير المشروع',
        tenantId: 'tenant-promet-sa'
      }
    ],
    installment_types: [
      { id: '1', name: 'سلفة نقدية عاجلة', icon: '💵', description: 'سلفة مالية مستقطعة من الراتب بدون فوائد' },
      { id: '2', name: 'قرض شخصي / تمويل', icon: '🏦', description: 'تمويل شخصي مع نسبة فائدة سنوية' },
      { id: '3', name: 'تقسيط أجهزة ومعدات', icon: '💻', description: 'شراء أجهزة ومعدات بالتقسيط' },
      { id: '4', name: 'قسط سيارة / مركبة', icon: '🚗', description: 'تمويل سيارات الشركة أو الموظفين' }
    ],
    employee_installments: [],
    installment_payments: [],
  };
};

// ============================================================
// 4. دوال مساعدة للاستعلامات (CRUD)
// ============================================================

export const findInDatabase = <T>(
  collection: keyof DatabaseSchema,
  filter: (item: any) => boolean
): T[] => {
  const db = loadDatabase();
  const items = db[collection] as any[] || [];
  return items.filter(filter) as T[];
};

export const findOneInDatabase = <T>(
  collection: keyof DatabaseSchema,
  filter: (item: any) => boolean
): T | undefined => {
  const db = loadDatabase();
  const items = db[collection] as any[] || [];
  return items.find(filter) as T;
};

export const findByIdInDatabase = <T>(
  collection: keyof DatabaseSchema,
  id: string
): T | undefined => {
  return findOneInDatabase<T>(collection, (item: any) => item.id === id);
};

export const insertInDatabase = <T>(
  collection: keyof DatabaseSchema,
  item: T
): T => {
  const db = loadDatabase();
  if (!db[collection]) {
    db[collection] = [];
  }
  const items = db[collection] as any[];
  items.push(item);
  saveDatabase(db);
  return item;
};

export const updateInDatabase = <T>(
  collection: keyof DatabaseSchema,
  id: string,
  updates: Partial<T>
): T | null => {
  const db = loadDatabase();
  const items = db[collection] as any[] || [];
  const index = items.findIndex((item: any) => item.id === id);
  if (index === -1) return null;
  
  const updated = { 
    ...items[index], 
    ...updates, 
    updatedAt: new Date().toISOString() 
  };
  items[index] = updated;
  saveDatabase(db);
  return updated;
};

export const deleteFromDatabase = (
  collection: keyof DatabaseSchema,
  id: string
): boolean => {
  const db = loadDatabase();
  const items = db[collection] as any[] || [];
  const index = items.findIndex((item: any) => item.id === id);
  if (index === -1) return false;
  items.splice(index, 1);
  saveDatabase(db);
  return true;
};

export const countInDatabase = (
  collection: keyof DatabaseSchema,
  filter?: (item: any) => boolean
): number => {
  const db = loadDatabase();
  const items = db[collection] as any[] || [];
  if (filter) {
    return items.filter(filter).length;
  }
  return items.length;
};

// ============================================================
// 5. تصدير كائن واحد للاستخدام السهل
// ============================================================

export const jsonDB = {
  load: loadDatabase,
  save: saveDatabase,
  seed: getInitialSeededData,
  find: findInDatabase,
  findOne: findOneInDatabase,
  findById: findByIdInDatabase,
  insert: insertInDatabase,
  update: updateInDatabase,
  delete: deleteFromDatabase,
  count: countInDatabase,
};

export default jsonDB;
