import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sendEmail } from './email.service';
import { logger } from '../config/logger';

// 1. تعريف واجهة مزودي النسخ الاحتياطي السحابي
export interface CloudFile {
  id: string;
  name: string;
  size: number;
  provider: 's3' | 'gcs' | 'dropbox';
  uploadedAt: string;
}

export interface CloudBackupProvider {
  upload(filename: string, content: Buffer): Promise<string>;
  download(fileId: string): Promise<Buffer>;
  list(): Promise<CloudFile[]>;
  delete(fileId: string): Promise<void>;
}

// مفتاح التشفير الافتراضي (يمكن للمستخدم تعيينه عبر متغيرات البيئة)
const ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || 'promet-erp-ultra-secure-key-32ch'; // 32 chars
const IV_LENGTH = 16; // For AES

// ============================================================
// 2. دوال التشفير وفك التشفير والتحقق من البيانات
// ============================================================

export function encryptBackup(content: string): Buffer {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    // Ensure key is exactly 32 bytes
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(content);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Append iv at the beginning
    return Buffer.concat([iv, encrypted]);
  } catch (error) {
    logger.error("❌ Encryption error:", error);
    throw new Error("Failed to encrypt backup: " + (error as Error).message);
  }
}

export function decryptBackup(encryptedBuffer: Buffer): string {
  try {
    const iv = encryptedBuffer.subarray(0, IV_LENGTH);
    const encryptedData = encryptedBuffer.subarray(IV_LENGTH);
    const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    logger.error("❌ Decryption error:", error);
    throw new Error("Failed to decrypt backup (incorrect key or corrupted file)");
  }
}

export function validateBackupData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  // Check essential keys
  const requiredCollections = ['tenantId', 'exportedAt', 'invoices', 'employees', 'company_settings'];
  for (const key of requiredCollections) {
    if (!(key in data)) {
      logger.warn(`⚠️ Backup validation failed: missing key "${key}"`);
      return false;
    }
  }
  return true;
}

// ============================================================
// 3. تطبيق مزودي النسخ الاحتياطي السحابي (محاكي تفاعلي ديناميكي)
// يحفظ الملفات محلياً في مجلدات منفصلة لضمان استقرار العمل بدون إعدادات مسبقة،
// مع إمكانية الترقية لـ APIs حقيقية بسلاسة.
// ============================================================

class BaseSimulatedProvider {
  protected baseDir: string;
  protected providerName: 's3' | 'gcs' | 'dropbox';

  constructor(providerName: 's3' | 'gcs' | 'dropbox') {
    this.providerName = providerName;
    this.baseDir = path.join(process.cwd(), 'backups', 'cloud', providerName);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async upload(filename: string, content: Buffer): Promise<string> {
    const filePath = path.join(this.baseDir, filename);
    fs.writeFileSync(filePath, content);
    logger.info(`☁️ [${this.providerName.toUpperCase()}] Uploaded backup: ${filename} (${content.length} bytes)`);
    return `${this.providerName}://backups/${filename}`;
  }

  async download(fileId: string): Promise<Buffer> {
    // fileId will be like s3://backups/filename.json.enc
    const filename = fileId.split('/').pop() || fileId;
    const filePath = path.join(this.baseDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`[${this.providerName.toUpperCase()}] File not found in cloud storage.`);
    }
    return fs.readFileSync(filePath);
  }

  async list(): Promise<CloudFile[]> {
    if (!fs.existsSync(this.baseDir)) return [];
    const files = fs.readdirSync(this.baseDir);
    return files.map(file => {
      const filePath = path.join(this.baseDir, file);
      const stats = fs.statSync(filePath);
      return {
        id: `${this.providerName}://backups/${file}`,
        name: file,
        size: stats.size,
        provider: this.providerName,
        uploadedAt: (stats.birthtime || stats.mtime).toISOString()
      };
    }).sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }

  async delete(fileId: string): Promise<void> {
    const filename = fileId.split('/').pop() || fileId;
    const filePath = path.join(this.baseDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`🗑️ [${this.providerName.toUpperCase()}] Deleted backup file: ${filename}`);
    }
  }
}

export class AWSS3BackupProvider extends BaseSimulatedProvider implements CloudBackupProvider {
  constructor() {
    super('s3');
  }
}

export class GoogleCloudStorageBackupProvider extends BaseSimulatedProvider implements CloudBackupProvider {
  constructor() {
    super('gcs');
  }
}

export class DropboxBackupProvider extends BaseSimulatedProvider implements CloudBackupProvider {
  constructor() {
    super('dropbox');
  }
}

export const getCloudProvider = (providerType: 's3' | 'gcs' | 'dropbox'): CloudBackupProvider => {
  switch (providerType) {
    case 's3': return new AWSS3BackupProvider();
    case 'gcs': return new GoogleCloudStorageBackupProvider();
    case 'dropbox': return new DropboxBackupProvider();
    default: throw new Error("Invalid provider type specified");
  }
};

// ============================================================
// 4. إرسال التقارير البريدية عند إتمام أو فشل العمليات
// ============================================================

export async function sendBackupNotification(status: 'success' | 'failed', details: {
  fileName: string;
  fileSize: number;
  provider: string;
  error?: string;
  action: 'backup' | 'restore';
}) {
  const mailTo = process.env.SMTP_USER || 'admin@company.com';
  const statusStr = status === 'success' ? '✅ نجاح العملية' : '❌ فشل العملية';
  const actionTitle = details.action === 'backup' ? 'تقرير النسخ الاحتياطي السحابي' : 'تقرير استعادة البيانات';

  const body = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; direction: rtl; text-align: right; background-color: #f8fafc;">
      <h2 style="color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">📌 ${actionTitle} - ${new Date().toLocaleDateString('ar-EG')}</h2>
      <p style="font-size: 14px; color: #334155;">نود إخطاركم بتقرير النظام التالي لخدمة حفظ وتأمين البيانات:</p>
      
      <div style="background-color: ${status === 'success' ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${status === 'success' ? '#bbf7d0' : '#fecaca'}; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <strong style="color: ${status === 'success' ? '#15803d' : '#b91c1c'}; font-size: 16px;">الحالة: ${statusStr}</strong>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px;">
        <tr style="background-color: #f1f5f9;">
          <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">البيان</th>
          <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">التفاصيل</th>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">اسم الملف</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-family: monospace;">${details.fileName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">حجم الملف</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${(details.fileSize / 1024).toFixed(2)} KB</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">موقع الحفظ / المزود</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold; text-transform: uppercase;">${details.provider}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">التوقيت</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1;">${new Date().toLocaleString('ar-EG')}</td>
        </tr>
        ${details.error ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #cbd5e1; color: #b91c1c;">تفاصيل الخطأ</td>
          <td style="padding: 8px; border: 1px solid #cbd5e1; color: #b91c1c; font-family: monospace;">${details.error}</td>
        </tr>` : ''}
      </table>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #64748b; font-size: 11px;">تم توليد هذا البريد الإلكتروني تلقائياً بواسطة نظام Promet ERP الذكي لتأمين البيانات وحفظها.</p>
    </div>
  `;

  await sendEmail({
    to: mailTo,
    subject: `📌 ${actionTitle} [${statusStr}] - ${details.fileName}`,
    html: body
  }).catch(err => {
    logger.error("❌ Failed to dispatch backup report email:", err);
  });
}
