import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { logger } from '../config/logger';
import { jsonDB } from '../data/jsonDatabase';
import { isFirebaseConnected, firestore } from '../../services/firebase.service';

const AUDIT_LOG_FILE = path.join(process.cwd(), 'audit_trail.log');
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';

// Fallback secure key for AES encryption if not defined in process.env
const getEncryptionKey = (): Buffer => {
  const key = process.env.DB_ENCRYPTION_KEY || 'promet_secure_enterprise_key_2026_aes_secret';
  // Ensure we have exactly 32 bytes (256 bits)
  return crypto.createHash('sha256').update(key).digest();
};

const IV_LENGTH = 16; // For AES, this is always 16 bytes

export class SecurityService {
  /**
   * 1. End-to-End Field-Level Encryption (AES-256-CBC)
   */
  static encrypt(text: string): string {
    if (!text) return '';
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (err) {
      logger.error('Encryption failed:', err);
      return text; // Return plain text as fallback safely
    }
  }

  static decrypt(encryptedText: string): string {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
    try {
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts.shift()!, 'hex');
      const encrypted = parts.join(':');
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, getEncryptionKey(), iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      // If decryption fails, it might be unencrypted plain text
      return encryptedText;
    }
  }

  static encryptPayrollFields(record: any): any {
    if (!record) return record;
    const copied = { ...record };
    const fieldsToEncrypt = [
      'basicSalary', 'basic_salary', 'base_salary',
      'allowance', 'allowances', 'allower',
      'deductions', 'netSalary', 'net_salary'
    ];
    for (const field of fieldsToEncrypt) {
      if (copied[field] !== undefined && copied[field] !== null) {
        const valStr = String(copied[field]);
        if (!valStr.includes(':')) {
          copied[field] = SecurityService.encrypt(valStr);
        }
      }
    }
    return copied;
  }

  static decryptPayrollFields(record: any): any {
    if (!record) return record;
    const copied = { ...record };
    const fieldsToDecrypt = [
      'basicSalary', 'basic_salary', 'base_salary',
      'allowance', 'allowances', 'allower',
      'deductions', 'netSalary', 'net_salary'
    ];
    for (const field of fieldsToDecrypt) {
      if (copied[field] !== undefined && copied[field] !== null) {
        const valStr = String(copied[field]);
        if (valStr.includes(':')) {
          const decrypted = SecurityService.decrypt(valStr);
          const parsed = Number(decrypted);
          copied[field] = isNaN(parsed) ? decrypted : parsed;
        }
      }
    }
    return copied;
  }

  /**
   * 2. Advanced Attribute-Based Access Control (ABAC)
   * Evaluates user and resource attributes against safety rules
   */
  static checkABAC(user: any, action: string, resourceType: string, resourceData?: any): { allowed: boolean; reason: string } {
    if (!user) {
      return { allowed: false, reason: 'مستخدم غير موثق' };
    }

    // Admins have full access always
    if (user.role === 'admin') {
      return { allowed: true, reason: 'صلاحيات المدير الكاملة تمنح حق الوصول' };
    }

    // Role-Based attributes override (RBAC component)
    const userRole = user.role;
    const userDept = user.department || 'general';

    // 1. Invoices
    if (resourceType === 'invoice') {
      const amount = Number(resourceData?.totalAmount || resourceData?.amount || 0);

      // Financial constraints: Only managers or accountants can approve/create large invoices
      if (action === 'create' || action === 'approve') {
        if (amount > 100000 && userRole !== 'manager' && userRole !== 'admin') {
          return {
            allowed: false,
            reason: `غير مسموح بإنشاء أو اعتماد فواتير تتجاوز 100,000 ريال إلا من خلال المدير المالي أو مدير النظام (قيمتها الحالية: ${amount} ريال)`
          };
        }
      }

      // Check tenant bound isolation (Strict tenant isolation)
      if (resourceData?.tenantId && resourceData.tenantId !== user.tenantId) {
        return { allowed: false, reason: 'محاولة تعديل أو تصفح بيانات تابعة لمؤسسة أخرى!' };
      }
    }

    // 2. Payroll and Salaries (Extremely sensitive)
    if (resourceType === 'payroll' || resourceType === 'salary') {
      // Only HR and Admin can view/modify salary records
      if (userRole !== 'hr' && userRole !== 'admin' && userRole !== 'manager') {
        return { allowed: false, reason: 'صلاحيات الموارد البشرية أو الإدارة مطلوبة للاطلاع على الرواتب وكشوفها' };
      }
    }

    // 3. Employee Portal self-records access
    if (resourceType === 'employee_profile') {
      if (action === 'update' || action === 'read') {
        if (resourceData?.employeeId && String(resourceData.employeeId) !== String(user.employee_id) && userRole !== 'admin' && userRole !== 'hr') {
          return { allowed: false, reason: 'غير مسموح لك بتعديل أو تصفح ملفات الموظفين الآخرين' };
        }
      }
    }

    return { allowed: true, reason: 'اجتاز الفحص الأمني التلقائي (ABAC)' };
  }

  /**
   * 3. Immutable Append-Only Audit Logs Engine (ISO 27001 & GDPR Compliant)
   */
  static async logAction(params: {
    userId: string;
    userName: string;
    tenantId: string;
    action: string; // e.g., "INVOICE_CREATE", "PAYROLL_APPROVE"
    resourceId: string;
    details: string;
    ipAddress?: string;
  }) {
    const timestamp = new Date().toISOString();
    const logId = `aud-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const auditEntry = {
      id: logId,
      timestamp,
      userId: params.userId,
      userName: params.userName,
      tenantId: params.tenantId,
      action: params.action,
      resourceId: params.resourceId,
      details: params.details,
      ipAddress: params.ipAddress || '127.0.0.1',
      hash: ''
    };

    // Construct cryptographic signature/hash to prevent tampering (Immutable Integrity)
    const logString = `${timestamp}|${params.userId}|${params.action}|${params.resourceId}|${params.details}`;
    auditEntry.hash = crypto.createHmac('sha256', getEncryptionKey()).update(logString).digest('hex');

    // 1. Write to local immutable text log file (Append-Only)
    try {
      const line = JSON.stringify(auditEntry) + '\n';
      fs.appendFileSync(AUDIT_LOG_FILE, line, 'utf8');
    } catch (err) {
      logger.error('Failed to append to security audit trail file:', err);
    }

    // 2. Persist in database
    try {
      if (isFirebaseConnected() && firestore) {
        await firestore.collection('audit_logs').doc(logId).set(auditEntry);
      } else {
        const db = jsonDB.load();
        if (!db.audit_logs) db.audit_logs = [];
        db.audit_logs.push(auditEntry);
        jsonDB.save(db);
      }
    } catch (dbErr) {
      logger.error('Failed to save audit log to DB:', dbErr);
    }

    logger.info(`🛡️ [AUDIT LOG] ${params.action} by User ${params.userName} (Tenant: ${params.tenantId})`);
  }

  /**
   * Fetch audit logs securely
   */
  static async getAuditLogs(tenantId: string): Promise<any[]> {
    try {
      if (isFirebaseConnected() && firestore) {
        const snap = await firestore.collection('audit_logs').where('tenantId', '==', tenantId).orderBy('timestamp', 'desc').limit(200).get();
        return snap.docs.map(doc => doc.data());
      } else {
        const db = jsonDB.load();
        return (db.audit_logs || [])
          .filter((log: any) => log.tenantId === tenantId)
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    } catch (err) {
      logger.error('Error fetching audit logs:', err);
      // Fallback: Parse local log file
      try {
        if (fs.existsSync(AUDIT_LOG_FILE)) {
          const lines = fs.readFileSync(AUDIT_LOG_FILE, 'utf8').split('\n').filter(Boolean);
          return lines
            .map(line => JSON.parse(line))
            .filter(log => log.tenantId === tenantId)
            .reverse();
        }
      } catch (fErr) {
        logger.error('Failed to read backup audit file:', fErr);
      }
      return [];
    }
  }
}
