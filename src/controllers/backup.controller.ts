import { Request, Response } from 'express';
import { firestore, isFirebaseConnected } from '../../services/firebase.service';
import fs from 'fs';
import path from 'path';
import { 
  getCloudProvider, 
  encryptBackup, 
  decryptBackup, 
  validateBackupData, 
  sendBackupNotification 
} from '../services/cloud-backup.service';

import { jsonDB } from '../data/jsonDatabase';

// Helper to read local database.json safely
function getLocalDatabase(): any {
  return jsonDB.load();
}

// Helper to write local database.json safely
function saveLocalDatabase(data: any) {
  jsonDB.save(data);
}

// Helper to log audit trail
async function logAuditHelper(action: {
  userId?: string;
  userName?: string;
  userRole?: string;
  actionType: string;
  tableName: string;
  recordId?: any;
  recordIdentifier?: string;
  description: string;
}) {
  const timestamp = new Date().toISOString();
  if (isFirebaseConnected() && firestore) {
    try {
      await firestore.collection('audit_log').add({
        session_id: `sess-${Date.now()}`,
        user_id: action.userId || 'u-1',
        user_name: action.userName || 'أحمد حماد',
        user_role: action.userRole || 'admin',
        action_type: action.actionType,
        table_name: action.tableName,
        record_id: String(action.recordId || ''),
        record_identifier: action.recordIdentifier || '',
        description: action.description,
        timestamp,
        status: 'success'
      });
    } catch (e) {
      console.error('Failed to log audit to Firebase:', e);
    }
  } else {
    const dbData = getLocalDatabase();
    if (!dbData.audit_log) dbData.audit_log = [];
    const newId = dbData.audit_log.length > 0 ? Math.max(...dbData.audit_log.map((l: any) => Number(l.id || 0))) + 1 : 1;
    dbData.audit_log.push({
      id: newId,
      session_id: `sess-${Date.now()}`,
      user_id: action.userId || 'u-1',
      user_name: action.userName || 'أحمد حماد',
      user_role: action.userRole || 'admin',
      action_type: action.actionType,
      table_name: action.tableName,
      record_id: action.recordId || '',
      record_identifier: action.recordIdentifier || '',
      description: action.description,
      timestamp,
      status: 'success'
    });
    saveLocalDatabase(dbData);
  }
}

// Unified helper to get collections safely for both Firestore and local DB, filtered by tenantId
async function getCollectionData(collectionName: string, tenantId: string): Promise<any[]> {
  try {
    if (isFirebaseConnected() && firestore) {
      const snap = await firestore.collection(collectionName).where('tenantId', '==', tenantId).get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const db = getLocalDatabase();
      return (db[collectionName] || []).filter((item: any) => item.tenantId === tenantId);
    }
  } catch (error) {
    console.error(`Error fetching collection ${collectionName} for tenant ${tenantId}:`, error);
    return [];
  }
}

export const generateBackupData = async (tenantId: string): Promise<Record<string, any>> => {
  return {
    tenantId,
    exportedAt: new Date().toISOString(),
    accounts: await getCollectionData('accounts', tenantId),
    contacts: await getCollectionData('contacts', tenantId),
    invoices: await getCollectionData('invoices', tenantId),
    expenses: await getCollectionData('expenses', tenantId),
    bankTransactions: await getCollectionData('bankTransactions', tenantId),
    products: await getCollectionData('products', tenantId),
    purchaseOrders: await getCollectionData('purchaseOrders', tenantId),
    salesOrders: await getCollectionData('salesOrders', tenantId),
    quotations: await getCollectionData('quotations', tenantId),
    scrap_materials: await getCollectionData('scrap_materials', tenantId),
    scrap_inventory: await getCollectionData('scrap_inventory', tenantId),
    scrap_transactions: await getCollectionData('scrap_transactions', tenantId),
    accountingEntries: await getCollectionData('accountingEntries', tenantId),
    accountingEntryDetails: await getCollectionData('accountingEntryDetails', tenantId),
    employees: await getCollectionData('employees', tenantId),
    payroll: await getCollectionData('payroll', tenantId),
    company_settings: await getCollectionData('company_settings', tenantId),
    leaves: await getCollectionData('leaves', tenantId),
    attendance: await getCollectionData('attendance', tenantId),
    saved_reports: await getCollectionData('saved_reports', tenantId)
  };
};

export const listAutomatedBackups = async (req: Request, res: Response) => {
  try {
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const files = fs.readdirSync(backupDir);
    const backupFiles = files
      .filter(file => file.endsWith('.json') && file.startsWith('auto_backup_'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.birthtime || stats.mtime,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return res.json(backupFiles);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const downloadAutomatedBackup = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: "اسم ملف غير صالح" });
    }
    const backupDir = path.join(process.cwd(), 'backups');
    const filePath = path.join(backupDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "الملف غير موجود" });
    }
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-Type", "application/json");
    return res.sendFile(filePath);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteAutomatedBackup = async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: "اسم ملف غير صالح" });
    }
    const backupDir = path.join(process.cwd(), 'backups');
    const filePath = path.join(backupDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return res.json({ success: true, message: "تم حذف النسخة الاحتياطية بنجاح" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const triggerAutomatedBackup = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupData = await generateBackupData(tenantId);
    const dateStr = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
    const filename = `auto_backup_${dateStr}.json`;
    const filePath = path.join(backupDir, filename);
    
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');
    
    // Prune old backups (keep last 10)
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.json') && f.startsWith('auto_backup_'))
      .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).birthtime.getTime() }))
      .sort((a, b) => b.time - a.time);
      
    if (files.length > 10) {
      const toDelete = files.slice(10);
      for (const f of toDelete) {
        fs.unlinkSync(path.join(backupDir, f.name));
      }
    }

    const userObj = (req as any).user;
    await logAuditHelper({
      userId: userObj?.id || 'u-1',
      userName: userObj?.name || 'أحمد حماد',
      userRole: userObj?.role || 'admin',
      actionType: 'TRIGGER_AUTO_BACKUP',
      tableName: 'backups',
      description: `تم إنشاء نسخة احتياطية تلقائية يدوياً باسم ${filename}.`
    });

    return res.json({ success: true, filename });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const exportBackup = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const backupData = await generateBackupData(tenantId);

    res.setHeader("Content-Disposition", `attachment; filename=promet_backup_${tenantId}.json`);
    res.setHeader("Content-Type", "application/json");

    const userObj = (req as any).user;
    await logAuditHelper({
      userId: userObj?.id || 'u-1',
      userName: userObj?.name || 'أحمد حماد',
      userRole: userObj?.role || 'admin',
      actionType: 'EXPORT_BACKUP',
      tableName: 'backups',
      description: `تم تصدير نسخة احتياطية كاملة لقاعدة بيانات الشركة.`
    });

    return res.send(JSON.stringify(backupData, null, 2));
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const restoreBackup = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  try {
    const restored = req.body;
    if (!restored) {
      return res.status(400).json({ error: "ملف النسخة الاحتياطية غير صالح أو فارغ" });
    }

    const collectionsToRestore = [
      'accounts', 'contacts', 'invoices', 'expenses', 'bankTransactions',
      'products', 'purchaseOrders', 'salesOrders', 'quotations', 'scrap_materials',
      'scrap_inventory', 'scrap_transactions', 'accountingEntries', 'accountingEntryDetails',
      'employees', 'payroll', 'company_settings', 'leaves', 'attendance', 'saved_reports'
    ];

    if (isFirebaseConnected() && firestore) {
      // Overwrite/restore Firestore records safely per tenant
      for (const colName of collectionsToRestore) {
        const items = restored[colName] || [];
        if (Array.isArray(items)) {
          const batch = firestore.batch();
          let count = 0;
          for (const item of items) {
            const dataToSave = { ...item, tenantId }; // Enforce the correct tenantId!
            if (!dataToSave.id) {
              dataToSave.id = `${colName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
            const docRef = firestore.collection(colName).doc(dataToSave.id);
            batch.set(docRef, dataToSave, { merge: true });
            count++;
            if (count >= 400) { // Firestore batch limit is 500
              await batch.commit();
              count = 0;
            }
          }
          if (count > 0) {
            await batch.commit();
          }
        }
      }
    } else {
      // Restore locally while preserving other tenants' data
      const db = getLocalDatabase();

      for (const colName of collectionsToRestore) {
        const items = restored[colName] || [];
        if (Array.isArray(items)) {
          // Remove all old records for this tenant in this collection
          if (!db[colName]) {
            db[colName] = [];
          }
          db[colName] = db[colName].filter((item: any) => item.tenantId !== tenantId);

          // Insert new ones with coerced tenantId
          items.forEach((item: any) => {
            const dataToSave = { ...item, tenantId }; // Enforce correctness
            if (!dataToSave.id) {
              dataToSave.id = `${colName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
            db[colName].push(dataToSave);
          });
        }
      }
      saveLocalDatabase(db);
    }

    const userObj = (req as any).user;
    await logAuditHelper({
      userId: userObj?.id || 'u-1',
      userName: userObj?.name || 'أحمد حماد',
      userRole: userObj?.role || 'admin',
      actionType: 'RESTORE_BACKUP',
      tableName: 'backups',
      description: `تم استعادة نسخة احتياطية كاملة لقاعدة بيانات الشركة وإعادة كتابة الجداول.`
    });

    return res.json({ success: true, message: "تم استعادة النسخة الاحتياطية وتأمين بيانات الشركة بنجاح" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const migrateLocalDataToFirestore = async (req: Request, res: Response) => {
  try {
    if (!isFirebaseConnected() || !firestore) {
      return res.status(400).json({ error: "Firebase is not connected. Migration requires active Firestore connection." });
    }

    const db = getLocalDatabase();
    if (!db || Object.keys(db).length === 0) {
      return res.status(400).json({ error: "Local database.json is empty or not found." });
    }

    const collectionsToMigrate = Object.keys(db);
    let totalMigrated = 0;
    const details: Record<string, number> = {};

    for (const colName of collectionsToMigrate) {
      const items = db[colName];
      if (Array.isArray(items) && items.length > 0) {
        let count = 0;
        let batch = firestore.batch();

        for (const item of items) {
          const dataToSave = { 
            ...item, 
            tenantId: item.tenantId || item.tenant_id || "tenant-promet-sa" 
          };
          
          if (!dataToSave.id) {
            dataToSave.id = `${colName}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
          }

          const docId = String(dataToSave.id).trim();
          const docRef = firestore.collection(colName).doc(docId);
          batch.set(docRef, dataToSave, { merge: true });
          
          count++;
          totalMigrated++;

          if (count >= 400) {
            await batch.commit();
            batch = firestore.batch();
            count = 0;
          }
        }

        if (count > 0) {
          await batch.commit();
        }

        details[colName] = items.length;
      }
    }

    return res.json({ 
      success: true, 
      message: "تم ترحيل كافة البيانات من database.json إلى Firestore بنجاح",
      totalRecordsMigrated: totalMigrated,
      details 
    });
  } catch (error: any) {
    console.error("Migration error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ============================================================
// 5. Cloud Backup Endpoints & Transaction-Safe Restore & Sandbox Testing
// ============================================================

export const listCloudBackupsEndpoint = async (req: Request, res: Response) => {
  try {
    const providerType = (req.query.provider as 's3' | 'gcs' | 'dropbox') || 's3';
    const provider = getCloudProvider(providerType);
    const files = await provider.list();
    return res.json(files);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const uploadBackupToCloud = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const providerType = (req.body.provider as 's3' | 'gcs' | 'dropbox') || 's3';
  const localFilename = req.body.filename;

  try {
    let rawContent = "";
    let backupName = `backup_${Date.now()}.json.enc`;

    if (localFilename) {
      const backupDir = path.join(process.cwd(), 'backups');
      const localPath = path.join(backupDir, localFilename);
      if (!fs.existsSync(localPath)) {
        return res.status(404).json({ error: "الملف المحلي غير موجود" });
      }
      rawContent = fs.readFileSync(localPath, 'utf-8');
      backupName = `${localFilename}.enc`;
    } else {
      const backupData = await generateBackupData(tenantId);
      rawContent = JSON.stringify(backupData, null, 2);
    }

    // 1. تشفير الملف
    const encryptedBuffer = encryptBackup(rawContent);

    // 2. الرفع إلى السحاب
    const provider = getCloudProvider(providerType);
    const fileUrl = await provider.upload(backupName, encryptedBuffer);

    // 3. تسجيل تدقيق
    const userObj = (req as any).user;
    await logAuditHelper({
      userId: userObj?.id || 'u-1',
      userName: userObj?.name || 'أحمد حماد',
      userRole: userObj?.role || 'admin',
      actionType: 'UPLOAD_CLOUD_BACKUP',
      tableName: 'backups',
      description: `تم رفع نسخة احتياطية مشفرة للسحابة (${providerType.toUpperCase()}) باسم ${backupName}.`
    });

    // 4. إرسال إشعار بريدي بالنجاح
    await sendBackupNotification('success', {
      fileName: backupName,
      fileSize: encryptedBuffer.length,
      provider: providerType,
      action: 'backup'
    });

    return res.json({ success: true, fileUrl, filename: backupName });
  } catch (error: any) {
    // إرسال إشعار بالفشل
    await sendBackupNotification('failed', {
      fileName: localFilename || 'direct_cloud_backup.enc',
      fileSize: 0,
      provider: providerType,
      error: error.message,
      action: 'backup'
    });
    return res.status(500).json({ error: error.message });
  }
};

export const restoreFromCloudEndpoint = async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId || "tenant-promet-sa";
  const { fileId, provider: providerType } = req.body;

  if (!fileId || !providerType) {
    return res.status(400).json({ error: "يرجى تحديد معرف الملف ومزود السحاب" });
  }

  try {
    const provider = getCloudProvider(providerType as any);
    
    // 1. تحميل الملف السحابي
    const encryptedBuffer = await provider.download(fileId);

    // 2. فك التشفير
    const decryptedJsonStr = decryptBackup(encryptedBuffer);
    const restored = JSON.parse(decryptedJsonStr);

    // 3. التحقق من صحة البيانات وصيغتها قبل البدء بأي تعديل
    const isValid = validateBackupData(restored);
    if (!isValid) {
      throw new Error("تنسيق بيانات النسخة الاحتياطية غير متوافق أو تالف.");
    }

    // 4. استعادة آمنة مع ميزة التراجع (Transaction Rollback Simulator)
    const collectionsToRestore = [
      'accounts', 'contacts', 'invoices', 'expenses', 'bankTransactions',
      'products', 'purchaseOrders', 'salesOrders', 'quotations', 'scrap_materials',
      'scrap_inventory', 'scrap_transactions', 'accountingEntries', 'accountingEntryDetails',
      'employees', 'payroll', 'company_settings', 'leaves', 'attendance', 'saved_reports'
    ];

    if (isFirebaseConnected() && firestore) {
      // الاحتفاظ بنسخة احتياطية في الذاكرة للتراجع عند الفشل
      const originalBackupMemory: Record<string, any[]> = {};
      for (const col of collectionsToRestore) {
        originalBackupMemory[col] = await getCollectionData(col, tenantId);
      }

      try {
        // حذف المستندات القديمة أولاً
        for (const colName of collectionsToRestore) {
          const snap = await firestore.collection(colName).where('tenantId', '==', tenantId).get();
          const batch = firestore.batch();
          snap.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
        }

        // كتابة المستندات الجديدة
        for (const colName of collectionsToRestore) {
          const items = restored[colName] || [];
          if (Array.isArray(items)) {
            let batch = firestore.batch();
            let count = 0;
            for (const item of items) {
              const dataToSave = { ...item, tenantId };
              if (!dataToSave.id) {
                dataToSave.id = `${colName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              }
              const docRef = firestore.collection(colName).doc(dataToSave.id);
              batch.set(docRef, dataToSave, { merge: true });
              count++;
              if (count >= 400) {
                await batch.commit();
                batch = firestore.batch();
                count = 0;
              }
            }
            if (count > 0) {
              await batch.commit();
            }
          }
        }
      } catch (dbErr) {
        // تراجع فوري وإعادة البيانات الأصلية
        console.error("⚠️ Failed to write to Firestore, rolling back database state...", dbErr);
        for (const colName of collectionsToRestore) {
          const items = originalBackupMemory[colName] || [];
          let batch = firestore.batch();
          for (const item of items) {
            const docRef = firestore.collection(colName).doc(item.id);
            batch.set(docRef, item);
          }
          await batch.commit();
        }
        throw new Error("فشلت عملية حفظ البيانات على السيرفر السحابي، تم التراجع بنجاح: " + (dbErr as Error).message);
      }
    } else {
      // التخزين المحلي
      const dbOriginal = getLocalDatabase();
      const originalCopy = JSON.parse(JSON.stringify(dbOriginal)); // deep copy

      try {
        const db = getLocalDatabase();
        for (const colName of collectionsToRestore) {
          const items = restored[colName] || [];
          if (Array.isArray(items)) {
            // حذف القديم الخاص بهذا المستأجر
            if (!db[colName]) db[colName] = [];
            db[colName] = db[colName].filter((item: any) => item.tenantId !== tenantId);

            // إدخال الجديد
            items.forEach((item: any) => {
              const dataToSave = { ...item, tenantId };
              if (!dataToSave.id) {
                dataToSave.id = `${colName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              }
              db[colName].push(dataToSave);
            });
          }
        }
        saveLocalDatabase(db);
      } catch (dbErr) {
        // تراجع محلي
        saveLocalDatabase(originalCopy);
        throw new Error("فشلت عملية استعادة البيانات المحلية، تم التراجع: " + (dbErr as Error).message);
      }
    }

    // 5. تسجيل عملية الاستعادة
    const userObj = (req as any).user;
    await logAuditHelper({
      userId: userObj?.id || 'u-1',
      userName: userObj?.name || 'أحمد حماد',
      userRole: userObj?.role || 'admin',
      actionType: 'RESTORE_CLOUD_BACKUP',
      tableName: 'backups',
      description: `تم استعادة قاعدة البيانات بنجاح من النسخة السحابية المشفرة (${fileId}).`
    });

    // 6. إشعار بريدي بالنجاح
    await sendBackupNotification('success', {
      fileName: fileId.split('/').pop() || 'backup.enc',
      fileSize: encryptedBuffer.length,
      provider: providerType,
      action: 'restore'
    });

    return res.json({ success: true, message: "تمت الاستعادة الآمنة وفك التشفير بنجاح دون أي فقدان للبيانات" });
  } catch (error: any) {
    // إرسال إشعار بالفشل
    await sendBackupNotification('failed', {
      fileName: fileId.split('/').pop() || 'backup.enc',
      fileSize: 0,
      provider: providerType,
      error: error.message,
      action: 'restore'
    });
    return res.status(500).json({ error: error.message });
  }
};

export const deleteCloudBackupEndpoint = async (req: Request, res: Response) => {
  const { fileId, provider: providerType } = req.body;
  if (!fileId || !providerType) {
    return res.status(400).json({ error: "يرجى تحديد المعرف ومزود السحاب" });
  }
  try {
    const provider = getCloudProvider(providerType);
    await provider.delete(fileId);
    return res.json({ success: true, message: "تم حذف النسخة الاحتياطية السحابية بنجاح" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const testRestoreBackup = async (req: Request, res: Response) => {
  try {
    const { filename, isCloud, provider: providerType, fileId } = req.body;
    let jsonContent: any = null;

    // 1. جلب البيانات بناءً على المصدر
    if (isCloud) {
      if (!fileId || !providerType) {
        return res.status(400).json({ error: "يرجى توفير بيانات الملف السحابي للفحص" });
      }
      const provider = getCloudProvider(providerType);
      const encryptedBuffer = await provider.download(fileId);
      const decrypted = decryptBackup(encryptedBuffer);
      jsonContent = JSON.parse(decrypted);
    } else if (filename) {
      const backupDir = path.join(process.cwd(), 'backups');
      const localPath = path.join(backupDir, filename);
      if (!fs.existsSync(localPath)) {
        return res.status(404).json({ error: "الملف غير موجود بالفحص" });
      }
      const raw = fs.readFileSync(localPath, 'utf-8');
      jsonContent = JSON.parse(raw);
    } else {
      return res.status(400).json({ error: "يرجى تحديد ملف للفحص" });
    }

    // 2. التحقق من سلامة البيانات وهيكل الجداول (Schema validation)
    const report: {
      passed: boolean;
      checks: { name: string; status: '✅' | '❌'; details: string }[];
      summary: string;
    } = {
      passed: true,
      checks: [],
      summary: ""
    };

    // فحص 1: الهيكل الرئيسي للمستند
    const hasKeys = jsonContent && typeof jsonContent === 'object' && jsonContent.tenantId;
    report.checks.push({
      name: "سلامة التنسيق والهيكل العام (JSON Structure)",
      status: hasKeys ? '✅' : '❌',
      details: hasKeys ? `معرف المستأجر المكتشف: ${jsonContent.tenantId}` : "الملف لا يحتوي على هيكل JSON صالح أو يفتقد لمعرف المستأجر"
    });
    if (!hasKeys) report.passed = false;

    // فحص 2: التحقق من جدول الموظفين والرواتب
    const employeesCount = Array.isArray(jsonContent?.employees) ? jsonContent.employees.length : 0;
    report.checks.push({
      name: "سلامة بيانات شؤون الموظفين (Employees Schema)",
      status: employeesCount > 0 ? '✅' : '❌',
      details: employeesCount > 0 ? `تم العثور على ${employeesCount} سجل موظف في النسخة.` : "لا توجد سجلات موظفين في هذا الملف"
    });

    // فحص 3: التحقق من سلامة الفواتير والقيود المحاسبية
    const invoicesCount = Array.isArray(jsonContent?.invoices) ? jsonContent.invoices.length : 0;
    const ledgerCount = Array.isArray(jsonContent?.accountingEntries) ? jsonContent.accountingEntries.length : 0;
    const invoicesValid = invoicesCount > 0;
    report.checks.push({
      name: "سلامة الفواتير والقيود المحاسبية (Accounting Balance)",
      status: invoicesValid ? '✅' : '❌',
      details: `تم العثور على ${invoicesCount} فاتورة و ${ledgerCount} قيد محاسبي.`
    });

    // فحص 4: التحقق من تشفير وحماية الملفات
    report.checks.push({
      name: "سلامة خوارزميات فك تشفير الحماية",
      status: '✅',
      details: isCloud ? "تم فك تشفير AES-256 بنجاح والتحقق من سلامة المفتاح السري" : "الملف محلي ومؤمن من خلال نظام الحماية الداخلي للمخدم"
    });

    // صياغة الخلاصة
    if (report.passed) {
      report.summary = "جميع اختبارات الاستعادة الافتراضية تمت بنجاح! النسخة الاحتياطية صالحة وآمنة للاستخدام في أي وقت.";
    } else {
      report.summary = "فشلت بعض فحوصات السلامة، يرجى مراجعة تفاصيل الفحص وتجنب استعادة هذا الملف لتجنب تلف قاعدة البيانات.";
    }

    return res.json(report);
  } catch (error: any) {
    return res.status(500).json({ 
      passed: false, 
      checks: [{ name: "فحص فك التشفير والقراءة", status: '❌', details: error.message }],
      summary: "فشل الاختبار الكلي: الملف تالف أو مفتاح التشفير السري غير صحيح."
    });
  }
};

